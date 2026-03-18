import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseComponentRegistry } from '../componentRegistryParser.js';

let tempDir: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-parser-test-'));
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function createTestFile(filename: string, content: string): string {
  const filePath = path.join(tempDir, filename);
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('parseComponentRegistry', () => {
  it('captures exposed names, local imports, and package imports', () => {
    const mdxContent = `
import Link from 'pliny/link';
import Button from './components/ui/Button';
import { NamedCard as Card } from './components/ui/Card';

export const components = {
  a: Link,
  Button,
  CustomCard: Card,
};
`;

    const filePath = createTestFile('MDXComponentsRegistry.tsx', mdxContent);
    const result = parseComponentRegistry(filePath);

    expect(result.errors).toHaveLength(0);
    expect(result.components).toEqual([
      {
        name: 'a',
        importName: 'Link',
        importPath: 'pliny/link',
        resolvedPath: 'pliny/link',
        isDefaultImport: true,
      },
      {
        name: 'Button',
        importName: 'Button',
        importPath: './components/ui/Button',
        resolvedPath: path.join(path.dirname(filePath), 'components/ui/Button.tsx'),
        isDefaultImport: true,
      },
      {
        name: 'CustomCard',
        importName: 'Card',
        importPath: './components/ui/Card',
        resolvedPath: path.join(path.dirname(filePath), 'components/ui/Card.tsx'),
        isDefaultImport: false,
      },
    ]);
  });
});
