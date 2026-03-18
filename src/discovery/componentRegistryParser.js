/**
 * Shared parser for SigNoz MDX component registries.
 * Used by both runtime Node consumers and discovery utilities.
 */

import path from 'path';
import { Node, Project } from 'ts-morph';

/**
 * Resolve an import path to a file-system path when possible.
 */
export function resolveImportPath(basePath, importPath) {
  let normalizedPath = importPath;

  if (importPath.startsWith('@/')) {
    normalizedPath = importPath.replace('@/', '../');
  }

  if (importPath.startsWith('.') || importPath.startsWith('@/')) {
    let resolvedPath = path.resolve(basePath, normalizedPath);

    if (!path.extname(resolvedPath)) {
      resolvedPath += '.tsx';
    }

    return resolvedPath;
  }

  return importPath;
}

/**
 * Parse MDXComponents.tsx to extract the exported component registry.
 */
export function parseComponentRegistry(mdxComponentsPath) {
  const errors = [];
  const components = [];

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      jsx: 2,
    },
  });

  let sourceFile;
  try {
    sourceFile = project.addSourceFileAtPath(mdxComponentsPath);
  } catch (error) {
    errors.push({
      type: 'file_not_found',
      message: `Could not read MDXComponents.tsx: ${error instanceof Error ? error.message : 'Unknown error'}`,
      filePath: mdxComponentsPath,
    });

    return { components, errors };
  }

  const importMap = new Map();

  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    if (importDeclaration.isTypeOnly()) {
      continue;
    }

    const moduleSpecifier = importDeclaration.getModuleSpecifierValue();

    const defaultImport = importDeclaration.getDefaultImport();
    if (defaultImport) {
      importMap.set(defaultImport.getText(), {
        importPath: moduleSpecifier,
        isDefaultImport: true,
      });
    }

    for (const namedImport of importDeclaration.getNamedImports()) {
      const localName = namedImport.getAliasNode()?.getText() ?? namedImport.getName();

      importMap.set(localName, {
        importPath: moduleSpecifier,
        isDefaultImport: false,
      });
    }
  }

  let componentsObject;
  const variableStatements = sourceFile.getVariableStatements();

  for (const statement of variableStatements) {
    if (!statement.isExported()) {
      continue;
    }

    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      if (!Node.isObjectLiteralExpression(initializer)) {
        continue;
      }

      const variableName = declaration.getName().toLowerCase();
      if (variableName.includes('component') || variableName === 'mdx') {
        componentsObject = initializer;
        break;
      }
    }

    if (componentsObject) {
      break;
    }
  }

  if (!componentsObject) {
    const defaultExport = sourceFile.getDefaultExportSymbol();
    if (defaultExport) {
      for (const declaration of defaultExport.getDeclarations()) {
        if (!Node.isExportAssignment(declaration)) {
          continue;
        }

        const expression = declaration.getExpression();
        if (Node.isObjectLiteralExpression(expression)) {
          componentsObject = expression;
          break;
        }

        if (!Node.isIdentifier(expression)) {
          continue;
        }

        const symbol = expression.getSymbol();
        if (!symbol) {
          continue;
        }

        for (const variableDeclaration of symbol.getDeclarations()) {
          if (!Node.isVariableDeclaration(variableDeclaration)) {
            continue;
          }

          const initializer = variableDeclaration.getInitializer();
          if (Node.isObjectLiteralExpression(initializer)) {
            componentsObject = initializer;
            break;
          }
        }

        if (componentsObject) {
          break;
        }
      }
    }
  }

  if (!componentsObject) {
    for (const statement of variableStatements) {
      for (const declaration of statement.getDeclarations()) {
        const variableName = declaration.getName();
        if (!['components', 'MDXComponents', 'mdxComponents'].includes(variableName)) {
          continue;
        }

        const initializer = declaration.getInitializer();
        if (Node.isObjectLiteralExpression(initializer)) {
          componentsObject = initializer;
          break;
        }
      }

      if (componentsObject) {
        break;
      }
    }
  }

  if (!componentsObject) {
    errors.push({
      type: 'invalid_export',
      message: 'Could not find components object export in MDXComponents.tsx. Expected an exported object containing component mappings.',
      filePath: mdxComponentsPath,
    });

    return { components, errors };
  }

  const basePath = path.dirname(mdxComponentsPath);

  for (const property of componentsObject.getProperties()) {
    if (Node.isShorthandPropertyAssignment(property)) {
      const importName = property.getName();
      const importInfo = importMap.get(importName);

      components.push({
        name: importName,
        importName,
        importPath: importInfo?.importPath ?? null,
        resolvedPath: importInfo ? resolveImportPath(basePath, importInfo.importPath) : null,
        isDefaultImport: importInfo?.isDefaultImport ?? null,
      });
      continue;
    }

    if (Node.isPropertyAssignment(property)) {
      const nameNode = property.getNameNode();
      const valueNode = property.getInitializer();

      let exposedName;
      if (Node.isIdentifier(nameNode)) {
        exposedName = nameNode.getText();
      } else if (Node.isStringLiteral(nameNode)) {
        exposedName = nameNode.getLiteralText();
      } else {
        continue;
      }

      if (!valueNode || !Node.isIdentifier(valueNode)) {
        continue;
      }

      const importName = valueNode.getText();
      const importInfo = importMap.get(importName);

      components.push({
        name: exposedName,
        importName,
        importPath: importInfo?.importPath ?? null,
        resolvedPath: importInfo ? resolveImportPath(basePath, importInfo.importPath) : null,
        isDefaultImport: importInfo?.isDefaultImport ?? null,
      });
      continue;
    }

    if (Node.isSpreadAssignment(property)) {
      errors.push({
        type: 'parse_error',
        message: 'Spread syntax in components object is not fully supported. Some components may be missing.',
        filePath: mdxComponentsPath,
      });
    }
  }

  return { components, errors };
}
