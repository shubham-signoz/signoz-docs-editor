/**
 * Tests for extractProps.ts
 * Tests extracting TypeScript props from component files and snippet generation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractProps, generateSnippet, generateReadableSnippet } from '../extractProps';
import type { ComponentProp } from '../types';

// Create a temporary directory for test files
let tempDir: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'props-test-'));
});

afterAll(() => {
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper to create a test component file
 */
function createTestComponent(filename: string, content: string): string {
  const filePath = path.join(tempDir, filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('extractProps', () => {
  describe('interface-based props', () => {
    it('should extract props from ComponentNameProps interface', () => {
      const componentCode = `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, disabled, variant }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}
`;
      const filePath = createTestComponent('Button.tsx', componentCode);
      const result = extractProps(filePath, 'Button');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(4);

      const labelProp = result.props.find((p) => p.name === 'label');
      expect(labelProp?.type).toBe('string');
      expect(labelProp?.required).toBe(true);

      const disabledProp = result.props.find((p) => p.name === 'disabled');
      expect(disabledProp?.type).toBe('boolean');
      expect(disabledProp?.required).toBe(false);

      const variantProp = result.props.find((p) => p.name === 'variant');
      expect(variantProp?.type).toBe("'primary' | 'secondary'");
      expect(variantProp?.required).toBe(false);
    });

    it('should extract props from generic Props interface', () => {
      const componentCode = `
interface Props {
  title: string;
  children: React.ReactNode;
}

export const Card = ({ title, children }: Props) => {
  return <div><h2>{title}</h2>{children}</div>;
};
`;
      const filePath = createTestComponent('Card.tsx', componentCode);
      const result = extractProps(filePath, 'Card');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(2);
    });

    it('should extract JSDoc descriptions', () => {
      const componentCode = `
interface AlertProps {
  /** The alert message to display */
  message: string;
  /** Alert severity level */
  severity?: 'info' | 'warning' | 'error';
  /**
   * Whether the alert can be dismissed
   * @default false
   */
  dismissible?: boolean;
}

export function Alert(props: AlertProps) {
  return <div>{props.message}</div>;
}
`;
      const filePath = createTestComponent('Alert.tsx', componentCode);
      const result = extractProps(filePath, 'Alert');

      const messageProp = result.props.find((p) => p.name === 'message');
      expect(messageProp?.description).toBe('The alert message to display');

      const dismissibleProp = result.props.find((p) => p.name === 'dismissible');
      expect(dismissibleProp?.description).toContain('Whether the alert can be dismissed');
      expect(dismissibleProp?.defaultValue).toBe('false');
    });
  });

  describe('type alias props', () => {
    it('should extract props from type alias', () => {
      const componentCode = `
type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function Input({ value, onChange, placeholder }: InputProps) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
`;
      const filePath = createTestComponent('Input.tsx', componentCode);
      const result = extractProps(filePath, 'Input');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(3);

      const valueProp = result.props.find((p) => p.name === 'value');
      expect(valueProp?.required).toBe(true);

      const placeholderProp = result.props.find((p) => p.name === 'placeholder');
      expect(placeholderProp?.required).toBe(false);
    });

    it('should handle intersection types', () => {
      const componentCode = `
interface BaseProps {
  id: string;
  className?: string;
}

type ButtonProps = BaseProps & {
  label: string;
  onClick: () => void;
};

export const Button = (props: ButtonProps) => <button>{props.label}</button>;
`;
      const filePath = createTestComponent('IntersectionButton.tsx', componentCode);
      const result = extractProps(filePath, 'Button');

      expect(result.error).toBeUndefined();
      // Should include props from both BaseProps and the additional props
      expect(result.props.some((p) => p.name === 'id')).toBe(true);
      expect(result.props.some((p) => p.name === 'label')).toBe(true);
    });
  });

  describe('extended interfaces', () => {
    it('should extract props from extended interfaces', () => {
      const componentCode = `
interface BaseProps {
  id: string;
  className?: string;
}

interface CardProps extends BaseProps {
  title: string;
  children: React.ReactNode;
}

export function Card(props: CardProps) {
  return <div id={props.id} className={props.className}><h2>{props.title}</h2>{props.children}</div>;
}
`;
      const filePath = createTestComponent('ExtendedCard.tsx', componentCode);
      const result = extractProps(filePath, 'Card');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(4);
      expect(result.props.some((p) => p.name === 'id')).toBe(true);
      expect(result.props.some((p) => p.name === 'title')).toBe(true);
    });
  });

  describe('component detection', () => {
    it('should extract props from arrow function component', () => {
      const componentCode = `
interface TabsProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export const Tabs = ({ tabs, activeTab, onTabChange }: TabsProps) => {
  return (
    <div>
      {tabs.map((tab, i) => (
        <button key={i} onClick={() => onTabChange(i)}>{tab}</button>
      ))}
    </div>
  );
};
`;
      const filePath = createTestComponent('Tabs.tsx', componentCode);
      const result = extractProps(filePath, 'Tabs');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(3);
    });

    it('should extract props from function declaration', () => {
      const componentCode = `
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function Modal(props: ModalProps) {
  if (!props.isOpen) return null;
  return <div>{props.title}</div>;
}
`;
      const filePath = createTestComponent('Modal.tsx', componentCode);
      const result = extractProps(filePath, 'Modal');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    it('should return error for non-existent file', () => {
      const result = extractProps('/non/existent/Component.tsx', 'Component');

      expect(result.props).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('file_not_found');
    });

    it('should return empty props for component without props interface', () => {
      const componentCode = `
export function SimpleComponent() {
  return <div>Hello</div>;
}
`;
      const filePath = createTestComponent('SimpleComponent.tsx', componentCode);
      const result = extractProps(filePath, 'SimpleComponent');

      expect(result.error).toBeUndefined();
      expect(result.props).toHaveLength(0);
    });
  });

  describe('complex types', () => {
    it('should handle various prop types', () => {
      const componentCode = `
interface ComplexProps {
  stringProp: string;
  numberProp: number;
  boolProp: boolean;
  arrayProp: string[];
  objectProp: { key: string };
  functionProp: () => void;
  unionProp: 'a' | 'b' | 'c';
  optionalProp?: React.ReactNode;
}

export function Complex(props: ComplexProps) {
  return <div />;
}
`;
      const filePath = createTestComponent('Complex.tsx', componentCode);
      const result = extractProps(filePath, 'Complex');

      expect(result.props).toHaveLength(8);

      const stringProp = result.props.find((p) => p.name === 'stringProp');
      expect(stringProp?.type).toBe('string');

      const arrayProp = result.props.find((p) => p.name === 'arrayProp');
      expect(arrayProp?.type).toBe('string[]');

      const functionProp = result.props.find((p) => p.name === 'functionProp');
      expect(functionProp?.type).toBe('() => void');
    });
  });
});

describe('generateSnippet', () => {
  it('should generate simple snippet for component without props', () => {
    const snippet = generateSnippet('Divider', []);
    expect(snippet).toBe('<Divider />');
  });

  it('should generate snippet with required props', () => {
    const props: ComponentProp[] = [
      { name: 'title', type: 'string', required: true },
      { name: 'onClick', type: '() => void', required: true },
    ];

    const snippet = generateSnippet('Button', props);

    expect(snippet).toContain('<Button');
    expect(snippet).toContain('title=');
    expect(snippet).toContain('onClick=');
    expect(snippet).toContain('/>');
  });

  it('should comment out optional props', () => {
    const props: ComponentProp[] = [
      { name: 'label', type: 'string', required: true },
      { name: 'disabled', type: 'boolean', required: false },
      { name: 'variant', type: 'string', required: false },
    ];

    const snippet = generateSnippet('Button', props);

    expect(snippet).toContain('label=');
    expect(snippet).toContain('{/* disabled');
    expect(snippet).toContain('{/* variant');
  });

  it('should generate snippet with children for ReactNode props', () => {
    const props: ComponentProp[] = [
      { name: 'title', type: 'string', required: true },
      { name: 'children', type: 'ReactNode', required: true },
    ];

    const snippet = generateSnippet('Card', props);

    expect(snippet).toContain('<Card');
    expect(snippet).toContain('</Card>');
    expect(snippet).toContain('{/* content */}');
  });

  it('should handle boolean props specially', () => {
    const props: ComponentProp[] = [
      { name: 'disabled', type: 'boolean', required: true },
    ];

    const snippet = generateSnippet('Button', props);
    // Boolean props should just have the prop name when true
    expect(snippet).toContain('disabled');
  });

  it('should use appropriate placeholders for common prop names', () => {
    const props: ComponentProp[] = [
      { name: 'className', type: 'string', required: true },
      { name: 'href', type: 'string', required: true },
      { name: 'title', type: 'string', required: true },
    ];

    const snippet = generateSnippet('Link', props);

    expect(snippet).toContain('className=');
    expect(snippet).toContain('href=');
    expect(snippet).toContain('title=');
  });
});

describe('generateReadableSnippet', () => {
  it('should remove snippet placeholders', () => {
    const props: ComponentProp[] = [
      { name: 'title', type: 'string', required: true },
      { name: 'count', type: 'number', required: true },
    ];

    const snippet = generateReadableSnippet('Counter', props);

    // Should not contain $1, $2, etc.
    expect(snippet).not.toMatch(/\$\d+/);
  });

  it('should generate human-readable output', () => {
    const props: ComponentProp[] = [
      { name: 'label', type: 'string', required: true },
    ];

    const snippet = generateReadableSnippet('Button', props);

    expect(snippet).toContain('<Button');
    expect(snippet).toContain('label=""');
  });
});

describe('snippet edge cases', () => {
  it('should handle components with many props', () => {
    const props: ComponentProp[] = Array.from({ length: 10 }, (_, i) => ({
      name: `prop${i}`,
      type: 'string',
      required: i < 3, // First 3 required
    }));

    const snippet = generateSnippet('ManyPropsComponent', props);

    // Should be multi-line due to many props
    expect(snippet.split('\n').length).toBeGreaterThan(1);
  });

  it('should handle union types by extracting first option', () => {
    const props: ComponentProp[] = [
      { name: 'variant', type: "'primary' | 'secondary' | 'tertiary'", required: true },
    ];

    const snippet = generateSnippet('Button', props);
    expect(snippet).toContain('variant="primary"');
  });

  it('should handle function props', () => {
    const props: ComponentProp[] = [
      { name: 'onChange', type: '(value: string) => void', required: true },
    ];

    const snippet = generateSnippet('Input', props);
    expect(snippet).toContain('onChange=');
  });

  it('should handle array props', () => {
    const props: ComponentProp[] = [
      { name: 'items', type: 'string[]', required: true },
    ];

    const snippet = generateSnippet('List', props);
    expect(snippet).toContain('items=');
  });
});
