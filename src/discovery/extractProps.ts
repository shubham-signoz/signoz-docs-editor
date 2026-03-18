/**
 * Extract TypeScript props from component files
 * Uses ts-morph for TypeScript AST parsing
 */

import {
  Project,
  Node,
  TypeAliasDeclaration,
  InterfaceDeclaration,
  PropertySignature,
  SourceFile,
} from 'ts-morph';
import type { ComponentProp, PropExtractionResult } from './types';

/**
 * Extract props from a component file
 *
 * @param componentPath - Absolute path to the component file
 * @param componentName - Name of the component (used to find Props interface)
 * @returns Extraction result with props or error
 */
export function extractProps(
  componentPath: string,
  componentName: string
): PropExtractionResult {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      jsx: 2, // React
    },
  });

  let sourceFile: SourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(componentPath);
  } catch (error) {
    return {
      props: [],
      error: {
        type: 'file_not_found',
        message: `Could not read component file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        componentName,
        filePath: componentPath,
      },
    };
  }

  try {
    // Strategy 1: Look for interface/type named `${ComponentName}Props`
    let propsType = findPropsType(sourceFile, `${componentName}Props`);

    // Strategy 2: Look for just `Props`
    if (!propsType) {
      propsType = findPropsType(sourceFile, 'Props');
    }

    // Strategy 3: Look for the component function and extract props from parameter type
    if (!propsType) {
      propsType = extractPropsFromComponent(sourceFile, componentName);
    }

    // Strategy 4: Look for any interface ending with Props
    if (!propsType) {
      const interfaces = sourceFile.getInterfaces();
      for (const iface of interfaces) {
        if (iface.getName().endsWith('Props')) {
          propsType = iface;
          break;
        }
      }
    }

    if (!propsType) {
      // No props found - component might not have any props
      return { props: [] };
    }

    // Extract properties from the type/interface
    const props = extractPropertiesFromType(propsType, sourceFile);

    return { props };
  } catch (error) {
    return {
      props: [],
      error: {
        type: 'prop_extraction_error',
        message: `Error extracting props: ${error instanceof Error ? error.message : 'Unknown error'}`,
        componentName,
        filePath: componentPath,
      },
    };
  }
}

/**
 * Find a Props interface or type alias by name
 */
function findPropsType(
  sourceFile: SourceFile,
  name: string
): InterfaceDeclaration | TypeAliasDeclaration | undefined {
  // Try interface first
  const iface = sourceFile.getInterface(name);
  if (iface) return iface;

  // Try type alias
  const typeAlias = sourceFile.getTypeAlias(name);
  if (typeAlias) return typeAlias;

  return undefined;
}

/**
 * Extract props type from the component function parameter
 */
function extractPropsFromComponent(
  sourceFile: SourceFile,
  componentName: string
): InterfaceDeclaration | TypeAliasDeclaration | undefined {
  // Look for function declarations
  const functions = sourceFile.getFunctions();
  for (const func of functions) {
    if (func.getName() === componentName) {
      const params = func.getParameters();
      if (params.length > 0) {
        const firstParam = params[0];
        if (firstParam) {
          const typeNode = firstParam.getTypeNode();
          if (typeNode && Node.isTypeReference(typeNode)) {
            const typeName = typeNode.getTypeName().getText();
            return findPropsType(sourceFile, typeName);
          }
        }
      }
    }
  }

  // Look for variable declarations (const Component = ...)
  const variables = sourceFile.getVariableDeclarations();
  for (const varDecl of variables) {
    if (varDecl.getName() === componentName) {
      const initializer = varDecl.getInitializer();

      // Arrow function: const Component = (props: Props) => ...
      if (Node.isArrowFunction(initializer)) {
        const params = initializer.getParameters();
        if (params.length > 0) {
          const firstParam = params[0];
          if (firstParam) {
            const typeNode = firstParam.getTypeNode();
            if (typeNode && Node.isTypeReference(typeNode)) {
              const typeName = typeNode.getTypeName().getText();
              return findPropsType(sourceFile, typeName);
            }
          }
        }
      }

      // Function expression: const Component = function(props: Props) { ... }
      if (Node.isFunctionExpression(initializer)) {
        const params = initializer.getParameters();
        if (params.length > 0) {
          const firstParam = params[0];
          if (firstParam) {
            const typeNode = firstParam.getTypeNode();
            if (typeNode && Node.isTypeReference(typeNode)) {
              const typeName = typeNode.getTypeName().getText();
              return findPropsType(sourceFile, typeName);
            }
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract properties from an interface or type alias
 */
function extractPropertiesFromType(
  propsType: InterfaceDeclaration | TypeAliasDeclaration,
  sourceFile: SourceFile
): ComponentProp[] {
  const props: ComponentProp[] = [];

  if (Node.isInterfaceDeclaration(propsType)) {
    // Get properties from interface
    const properties = propsType.getProperties();
    for (const prop of properties) {
      props.push(extractPropertyInfo(prop));
    }

    // Also check extended interfaces
    const extendedTypes = propsType.getExtends();
    for (const ext of extendedTypes) {
      const extName = ext.getExpression().getText();
      const extInterface = sourceFile.getInterface(extName);
      if (extInterface) {
        const extProps = extractPropertiesFromType(extInterface, sourceFile);
        // Add extended props, but don't override existing ones
        for (const extProp of extProps) {
          if (!props.some((p) => p.name === extProp.name)) {
            props.push(extProp);
          }
        }
      }
    }
  } else if (Node.isTypeAliasDeclaration(propsType)) {
    // Handle type alias
    const typeNode = propsType.getTypeNode();

    if (typeNode && Node.isTypeLiteral(typeNode)) {
      // Type literal: type Props = { ... }
      const properties = typeNode.getProperties();
      for (const prop of properties) {
        if (Node.isPropertySignature(prop)) {
          props.push(extractPropertyInfo(prop));
        }
      }
    } else if (typeNode && Node.isIntersectionTypeNode(typeNode)) {
      // Intersection type: type Props = BaseProps & { ... }
      for (const type of typeNode.getTypeNodes()) {
        if (Node.isTypeLiteral(type)) {
          const properties = type.getProperties();
          for (const prop of properties) {
            if (Node.isPropertySignature(prop)) {
              props.push(extractPropertyInfo(prop));
            }
          }
        } else if (Node.isTypeReference(type)) {
          const refName = type.getTypeName().getText();
          const refType = findPropsType(sourceFile, refName);
          if (refType) {
            const refProps = extractPropertiesFromType(refType, sourceFile);
            props.push(...refProps);
          }
        }
      }
    } else if (typeNode && Node.isTypeReference(typeNode)) {
      // Type reference: type Props = OtherProps
      const refName = typeNode.getTypeName().getText();
      const refType = findPropsType(sourceFile, refName);
      if (refType) {
        return extractPropertiesFromType(refType, sourceFile);
      }
    }
  }

  return props;
}

/**
 * Extract information from a single property signature
 */
function extractPropertyInfo(prop: PropertySignature): ComponentProp {
  const name = prop.getName();
  const isOptional = prop.hasQuestionToken();
  const typeNode = prop.getTypeNode();
  const type = typeNode ? formatType(typeNode.getText()) : 'unknown';

  // Extract JSDoc description
  const jsDocs = prop.getJsDocs();
  let description: string | undefined;
  if (jsDocs.length > 0) {
    description = jsDocs[0]?.getDescription().trim();
  }

  // Look for @default tag in JSDoc
  let defaultValue: string | undefined;
  for (const jsDoc of jsDocs) {
    const defaultTag = jsDoc.getTags().find((tag) => tag.getTagName() === 'default');
    if (defaultTag) {
      defaultValue = defaultTag.getCommentText()?.trim();
    }
  }

  return {
    name,
    type,
    required: !isOptional,
    defaultValue,
    description,
  };
}

/**
 * Format a type string for display
 * Simplifies complex types for better readability
 */
function formatType(type: string): string {
  // Remove import statements from types
  let formatted = type.replace(/import\([^)]+\)\./g, '');

  // Simplify React types
  formatted = formatted.replace(/React\.ReactNode/g, 'ReactNode');
  formatted = formatted.replace(/React\.ReactElement/g, 'ReactElement');
  formatted = formatted.replace(/React\.CSSProperties/g, 'CSSProperties');
  formatted = formatted.replace(/React\.FC/g, 'FC');

  // Trim whitespace
  formatted = formatted.trim();

  return formatted;
}

/**
 * Generate a snippet template for a component based on its props
 *
 * @param componentName - Name of the component
 * @param props - List of component props
 * @returns Snippet string with required props filled and optional props commented
 */
export function generateSnippet(componentName: string, props: ComponentProp[]): string {
  const requiredProps = props.filter((p) => p.required);
  const optionalProps = props.filter((p) => !p.required);

  // No props - simple self-closing tag
  if (props.length === 0) {
    return `<${componentName} />`;
  }

  // Build props string
  const propStrings: string[] = [];

  // Add required props with placeholder values
  for (const prop of requiredProps) {
    const placeholder = getPlaceholderForType(prop.type, prop.name);
    if (prop.type === 'boolean') {
      // Boolean props can be added as just the prop name if true
      propStrings.push(`  ${prop.name}`);
    } else {
      propStrings.push(`  ${prop.name}=${placeholder}`);
    }
  }

  // Add commented optional props
  for (const prop of optionalProps) {
    const placeholder = getPlaceholderForType(prop.type, prop.name);
    if (prop.type === 'boolean') {
      propStrings.push(`  {/* ${prop.name} */}`);
    } else {
      propStrings.push(`  {/* ${prop.name}=${placeholder} */}`);
    }
  }

  // Determine if component likely has children
  const hasChildrenProp = props.some((p) => p.name === 'children');
  const hasReactNodeProp = props.some(
    (p) => p.type.includes('ReactNode') || p.type.includes('ReactElement')
  );

  if (hasChildrenProp || hasReactNodeProp) {
    // Component with children
    return `<${componentName}
${propStrings.join('\n')}
>
  {/* content */}
</${componentName}>`;
  } else {
    // Self-closing component
    if (propStrings.length <= 2 && propStrings.every((s) => s.length < 30)) {
      // Short props - single line
      const inlineProps = propStrings.map((s) => s.trim()).join(' ');
      return `<${componentName} ${inlineProps} />`;
    } else {
      // Multi-line props
      return `<${componentName}
${propStrings.join('\n')}
/>`;
    }
  }
}

/**
 * Get a placeholder value for a given prop type
 */
function getPlaceholderForType(type: string, propName: string): string {
  // Handle common patterns based on prop name
  if (propName === 'className') return '"$1"';
  if (propName === 'id') return '"$2"';
  if (propName === 'href' || propName === 'src' || propName === 'url') return '"$3"';
  if (propName === 'title') return '"$4"';
  if (propName === 'alt') return '"$5"';
  if (propName === 'label') return '"$6"';
  if (propName === 'children') return '{$7}';

  // Handle based on type
  const normalizedType = type.toLowerCase();

  if (normalizedType === 'string') {
    return '"$1"';
  }
  if (normalizedType === 'number') {
    return '{$1}';
  }
  if (normalizedType === 'boolean') {
    return '{$1}';
  }
  if (normalizedType.includes('reactnode') || normalizedType.includes('reactelement')) {
    return '{$1}';
  }
  if (normalizedType.startsWith("'") || normalizedType.includes(" | '")) {
    // Literal union type - extract first option
    const match = type.match(/'([^']+)'/);
    if (match) {
      return `"${match[1]}"`;
    }
  }
  if (normalizedType.includes('[]') || normalizedType.includes('array')) {
    return '{[$1]}';
  }
  if (normalizedType.includes('=>') || normalizedType.includes('function')) {
    return '{($1) => $2}';
  }
  if (normalizedType === 'object' || normalizedType.startsWith('{')) {
    return '{{ $1 }}';
  }

  // Default
  return '{$1}';
}

/**
 * Generate a human-readable snippet for documentation purposes
 * (Without snippet placeholders like $1)
 */
export function generateReadableSnippet(
  componentName: string,
  props: ComponentProp[]
): string {
  const snippet = generateSnippet(componentName, props);
  // Remove snippet placeholders
  return snippet.replace(/\$\d+/g, '').replace(/{{\s*}}/g, '{}');
}
