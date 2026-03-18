export interface RegistryParseError {
  type: 'file_not_found' | 'parse_error' | 'invalid_export' | 'prop_extraction_error';
  message: string;
  componentName?: string;
  filePath?: string;
}

export interface RegistryComponentInfo {
  name: string;
  importName: string;
  importPath: string | null;
  resolvedPath: string | null;
  isDefaultImport: boolean | null;
}

export interface ParseComponentRegistryResult {
  components: RegistryComponentInfo[];
  errors: RegistryParseError[];
}

export function resolveImportPath(basePath: string, importPath: string): string;
export function parseComponentRegistry(mdxComponentsPath: string): ParseComponentRegistryResult;
