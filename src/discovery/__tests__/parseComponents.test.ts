/**
 * Tests for parseComponents.ts
 * Tests parsing MDXComponents.tsx to discover registered components
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseComponents, extractCategory, getCategories } from '../parseComponents';

// Create a temporary directory for test files
let tempDir: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdx-test-'));
});

afterAll(() => {
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper to create a test file
 */
function createTestFile(filename: string, content: string): string {
  const filePath = path.join(tempDir, filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('parseComponents', () => {
  describe('basic parsing', () => {
    it('should parse a simple MDXComponents.tsx with exported object', () => {
      const mdxContent = `
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import Admonition from './components/docs/Admonition';

export const MDXComponents = {
  Button,
  Card,
  Admonition,
};
`;
      const filePath = createTestFile('MDXComponents.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(3);

      expect(result.components.map((c) => c.name)).toContain('Button');
      expect(result.components.map((c) => c.name)).toContain('Card');
      expect(result.components.map((c) => c.name)).toContain('Admonition');
    });

    it('should parse default export object', () => {
      const mdxContent = `
import Button from './ui/Button';
import Alert from './ui/Alert';

export default {
  Button,
  Alert,
};
`;
      const filePath = createTestFile('MDXComponentsDefault.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(2);
    });

    it('should parse named imports correctly', () => {
      const mdxContent = `
import { Button } from './components/ui';
import { Alert, Card as CardComponent } from './components/ui';

export const components = {
  Button,
  Alert,
  Card: CardComponent,
};
`;
      const filePath = createTestFile('MDXComponentsNamed.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(3);

      // Check that aliased import is handled
      const cardComponent = result.components.find((c) => c.name === 'Card');
      expect(cardComponent).toBeDefined();
    });

    it('should parse property assignments with different names', () => {
      const mdxContent = `
import Warning from './components/Admonition';
import Info from './components/Admonition';

export const MDXComponents = {
  warning: Warning,
  info: Info,
};
`;
      const filePath = createTestFile('MDXComponentsRename.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.errors).toHaveLength(0);
      expect(result.components).toHaveLength(2);
      expect(result.components.map((c) => c.name)).toContain('warning');
      expect(result.components.map((c) => c.name)).toContain('info');
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent file', () => {
      const result = parseComponents('/non/existent/path/MDXComponents.tsx');

      expect(result.components).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe('file_not_found');
    });

    it('should return error when no components object is found', () => {
      const mdxContent = `
import React from 'react';

const SomeOtherThing = {
  foo: 'bar',
};

export { SomeOtherThing };
`;
      const filePath = createTestFile('MDXComponentsEmpty.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.type).toBe('invalid_export');
    });

    it('should warn about spread syntax in components object', () => {
      const mdxContent = `
import Button from './Button';
import * as extraComponents from './extras';

export const MDXComponents = {
  Button,
  ...extraComponents,
};
`;
      const filePath = createTestFile('MDXComponentsSpread.tsx', mdxContent);
      const result = parseComponents(filePath);

      // Should still find Button
      expect(result.components.some((c) => c.name === 'Button')).toBe(true);
      // Should have a warning about spread
      expect(result.errors.some((e) => e.message.includes('Spread syntax'))).toBe(true);
    });
  });

  describe('import path handling', () => {
    it('should skip node_modules imports', () => {
      const mdxContent = `
import React from 'react';
import { useState } from 'react';
import Button from './Button';

export const MDXComponents = {
  Button,
};
`;
      const filePath = createTestFile('MDXComponentsNodeModules.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.components).toHaveLength(1);
      expect(result.components[0]?.name).toBe('Button');
    });

    it('should handle relative import paths', () => {
      const mdxContent = `
import Button from './components/Button';
import Card from '../shared/Card';

export const MDXComponents = {
  Button,
  Card,
};
`;
      const filePath = createTestFile('MDXComponentsRelative.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.components).toHaveLength(2);

      const button = result.components.find((c) => c.name === 'Button');
      expect(button?.importPath).toBe('./components/Button');
    });

    it('should record default vs named imports correctly', () => {
      const mdxContent = `
import DefaultButton from './Button';
import { NamedCard } from './Card';

export const MDXComponents = {
  DefaultButton,
  NamedCard,
};
`;
      const filePath = createTestFile('MDXComponentsImportTypes.tsx', mdxContent);
      const result = parseComponents(filePath);

      const defaultBtn = result.components.find((c) => c.name === 'DefaultButton');
      const namedCard = result.components.find((c) => c.name === 'NamedCard');

      expect(defaultBtn?.isDefaultImport).toBe(true);
      expect(namedCard?.isDefaultImport).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    it('should handle default export with identifier reference', () => {
      const mdxContent = `
import Button from './Button';
import Card from './Card';

const components = {
  Button,
  Card,
};

export default components;
`;
      const filePath = createTestFile('MDXComponentsIndirect.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.components).toHaveLength(2);
    });

    it('should handle mixed shorthand and property assignments', () => {
      const mdxContent = `
import Button from './Button';
import Card from './Card';
import Alert from './Alert';

export const MDXComponents = {
  Button,
  CustomCard: Card,
  Alert,
};
`;
      const filePath = createTestFile('MDXComponentsMixed.tsx', mdxContent);
      const result = parseComponents(filePath);

      expect(result.components).toHaveLength(3);
      expect(result.components.map((c) => c.name)).toContain('Button');
      expect(result.components.map((c) => c.name)).toContain('CustomCard');
      expect(result.components.map((c) => c.name)).toContain('Alert');
    });
  });
});

describe('extractCategory', () => {
  it('should extract category from folder path', () => {
    expect(extractCategory('./components/ui/Button')).toBe('ui');
    expect(extractCategory('./components/docs/Admonition')).toBe('docs');
    expect(extractCategory('./components/layout/Header')).toBe('layout');
  });

  it('should return "general" for flat paths', () => {
    expect(extractCategory('./Button')).toBe('general');
    expect(extractCategory('../Button')).toBe('general');
  });

  it('should handle non-components paths', () => {
    expect(extractCategory('./ui/Button')).toBe('ui');
    expect(extractCategory('./shared/components/Button')).toBe('shared');
  });

  it('should handle paths with multiple levels', () => {
    expect(extractCategory('./components/ui/buttons/Button')).toBe('ui');
  });
});

describe('getCategories', () => {
  it('should return unique sorted categories', () => {
    const components = [
      { name: 'A', importPath: './components/ui/A', resolvedPath: '', isDefaultImport: true },
      { name: 'B', importPath: './components/docs/B', resolvedPath: '', isDefaultImport: true },
      { name: 'C', importPath: './components/ui/C', resolvedPath: '', isDefaultImport: true },
      { name: 'D', importPath: './components/layout/D', resolvedPath: '', isDefaultImport: true },
    ];

    const categories = getCategories(components);

    expect(categories).toEqual(['docs', 'layout', 'ui']);
  });

  it('should return empty array for empty input', () => {
    expect(getCategories([])).toEqual([]);
  });
});
