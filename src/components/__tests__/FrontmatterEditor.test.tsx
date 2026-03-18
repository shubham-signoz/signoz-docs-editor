import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FrontmatterEditor } from '../FrontmatterEditor'

describe('FrontmatterEditor', () => {
  const defaultProps = {
    frontmatter: {
      title: 'Test Document',
      description: 'A test description',
      tags: ['test', 'docs'],
      date: '2024-01-15',
      sidebar_label: 'Test',
      sidebar_position: 1,
      slug: '/test/document',
    },
    onChange: vi.fn(),
  }

  function renderControlledFrontmatterEditor(
    props: Partial<typeof defaultProps> = {}
  ) {
    const mergedProps = {
      ...defaultProps,
      ...props,
    }

    const Wrapper = () => {
      const [frontmatter, setFrontmatter] = useState(mergedProps.frontmatter)

      return (
        <FrontmatterEditor
          {...mergedProps}
          frontmatter={frontmatter}
          onChange={(next) => {
            mergedProps.onChange(next)
            setFrontmatter(next)
          }}
        />
      )
    }

    return render(<Wrapper />)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the frontmatter panel', () => {
      renderControlledFrontmatterEditor()
      expect(screen.getByText('Frontmatter')).toBeInTheDocument()
    })

    it('should display all standard fields', () => {
      renderControlledFrontmatterEditor()

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Sidebar Label')).toBeInTheDocument()
      expect(screen.getByText('Sidebar Position')).toBeInTheDocument()
      expect(screen.getByText('Slug')).toBeInTheDocument()
    })

    it('should display field values correctly', () => {
      renderControlledFrontmatterEditor()

      expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument()
      expect(screen.getByDisplayValue('A test description')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('/test/document')).toBeInTheDocument()
    })

    it('should display tags as chips', () => {
      renderControlledFrontmatterEditor()

      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('docs')).toBeInTheDocument()
    })

    it('should be expanded by default', () => {
      renderControlledFrontmatterEditor()

      // The title input should be visible (meaning panel is expanded)
      expect(screen.getByDisplayValue('Test Document')).toBeVisible()
    })

    it('should respect defaultExpanded prop', () => {
      render(<FrontmatterEditor {...defaultProps} defaultExpanded={false} />)

      // The title input should not be visible (panel is collapsed)
      expect(screen.queryByDisplayValue('Test Document')).not.toBeInTheDocument()
    })
  })

  describe('Collapsible Panel', () => {
    it('should toggle panel on header click', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      // Initially expanded
      expect(screen.getByDisplayValue('Test Document')).toBeVisible()

      // Click header to collapse
      const header = screen.getByText('Frontmatter')
      await user.click(header)

      // Should be collapsed
      await waitFor(() => {
        expect(
          screen.queryByDisplayValue('Test Document')
        ).not.toBeInTheDocument()
      })

      // Click again to expand
      await user.click(header)

      // Should be expanded again
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Document')).toBeVisible()
      })
    })
  })

  describe('Field Updates', () => {
    it('should call onChange when title changes', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const titleInput = screen.getByDisplayValue('Test Document')
      await user.clear(titleInput)
      await user.type(titleInput, 'New Title')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.title).toBe('New Title')
    })

    it('should call onChange when description changes', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const descInput = screen.getByDisplayValue('A test description')
      await user.clear(descInput)
      await user.type(descInput, 'Updated description')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.description).toBe('Updated description')
    })

    it('should call onChange when sidebar_position changes', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const positionInput = screen.getByDisplayValue('1')
      await user.clear(positionInput)
      await user.type(positionInput, '5')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.sidebar_position).toBe(5)
    })

    it('should call onChange when slug changes', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const slugInput = screen.getByDisplayValue('/test/document')
      await user.clear(slugInput)
      await user.type(slugInput, '/new/path')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.slug).toBe('/new/path')
    })
  })

  describe('Tags Management', () => {
    it('should add a new tag on Enter', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const tagInput = screen.getByPlaceholderText('Add tag (press Enter)')
      await user.type(tagInput, 'newtag{Enter}')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.tags).toContain('newtag')
    })

    it('should add a new tag on comma', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const tagInput = screen.getByPlaceholderText('Add tag (press Enter)')
      await user.type(tagInput, 'commatagged,')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.tags).toContain('commatagged')
    })

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const tagInput = screen.getByPlaceholderText('Add tag (press Enter)')
      await user.type(tagInput, 'test{Enter}')

      // The last call should still have only 2 tags since 'test' already exists
      expect(defaultProps.onChange).not.toHaveBeenCalled()
    })

    it('should remove tag when clicking remove button', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      // Find and click the remove button for 'test' tag
      const removeButtons = screen.getAllByLabelText(/Remove/)
      await user.click(removeButtons[0])

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.tags).not.toContain('test')
    })

    it('should remove last tag on backspace when input is empty', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const tagInput = screen.getByPlaceholderText('Add tag (press Enter)')
      await user.click(tagInput)
      await user.keyboard('{Backspace}')

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      // Should have one less tag
      expect(lastCall.tags.length).toBe(1)
    })
  })

  describe('Date Field', () => {
    it('should display formatted date', () => {
      renderControlledFrontmatterEditor()

      const dateInput = screen.getByDisplayValue('2024-01-15')
      expect(dateInput).toBeInTheDocument()
      expect(dateInput).toHaveAttribute('type', 'date')
    })

    it('should call onChange when date changes', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const dateInput = screen.getByDisplayValue('2024-01-15')
      await user.clear(dateInput)
      await user.type(dateInput, '2024-06-20')

      expect(defaultProps.onChange).toHaveBeenCalled()
    })

    it('should handle Date object in frontmatter', () => {
      const propsWithDateObject = {
        ...defaultProps,
        frontmatter: {
          ...defaultProps.frontmatter,
          date: new Date('2024-03-10'),
        },
      }

      render(<FrontmatterEditor {...propsWithDateObject} />)

      // Should convert Date object to string format
      const dateInput = screen.getByDisplayValue('2024-03-10')
      expect(dateInput).toBeInTheDocument()
    })
  })

  describe('Read Only Mode', () => {
    it('should disable all inputs when readOnly is true', () => {
      render(<FrontmatterEditor {...defaultProps} readOnly />)

      const titleInput = screen.getByDisplayValue('Test Document')
      expect(titleInput).toBeDisabled()

      const descInput = screen.getByDisplayValue('A test description')
      expect(descInput).toBeDisabled()
    })

    it('should hide tag input when readOnly is true', () => {
      render(<FrontmatterEditor {...defaultProps} readOnly />)

      expect(
        screen.queryByPlaceholderText('Add tag (press Enter)')
      ).not.toBeInTheDocument()
    })

    it('should hide tag remove buttons when readOnly is true', () => {
      render(<FrontmatterEditor {...defaultProps} readOnly />)

      expect(screen.queryByLabelText(/Remove/)).not.toBeInTheDocument()
    })

    it('should hide add custom field button when readOnly is true', () => {
      render(<FrontmatterEditor {...defaultProps} readOnly />)

      expect(
        screen.queryByText('+ Add custom field')
      ).not.toBeInTheDocument()
    })
  })

  describe('Custom Fields', () => {
    it('should display custom fields', () => {
      const propsWithCustom = {
        ...defaultProps,
        frontmatter: {
          ...defaultProps.frontmatter,
          custom_field: 'custom value',
        },
      }

      render(<FrontmatterEditor {...propsWithCustom} />)

      expect(screen.getByText('Custom Fields')).toBeInTheDocument()
      expect(screen.getByText('custom_field:')).toBeInTheDocument()
      expect(screen.getByDisplayValue('custom value')).toBeInTheDocument()
    })

    it('should add new custom field', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      // Click add custom field button
      const addButton = screen.getByText('+ Add custom field')
      await user.click(addButton)

      // Fill in the new field
      const keyInput = screen.getByPlaceholderText('Field name')
      const valueInput = screen.getByPlaceholderText('Value')

      await user.type(keyInput, 'new_field')
      await user.type(valueInput, 'new_value')

      // Click add button
      const confirmButton = screen.getByText('Add')
      await user.click(confirmButton)

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.new_field).toBe('new_value')
    })

    it('should remove custom field', async () => {
      const user = userEvent.setup()
      const propsWithCustom = {
        ...defaultProps,
        frontmatter: {
          ...defaultProps.frontmatter,
          custom_field: 'custom value',
        },
      }

      render(<FrontmatterEditor {...propsWithCustom} />)

      // Find and click the delete button for the custom field
      const deleteButton = screen.getByLabelText('Remove custom_field')
      await user.click(deleteButton)

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall).not.toHaveProperty('custom_field')
    })

    it('should cancel adding custom field', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      // Click add custom field button
      const addButton = screen.getByText('+ Add custom field')
      await user.click(addButton)

      // Click cancel button
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      // Should be back to normal state
      expect(screen.getByText('+ Add custom field')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Field name')).not.toBeInTheDocument()
    })

    it('should parse JSON values in custom fields', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      // Click add custom field button
      const addButton = screen.getByText('+ Add custom field')
      await user.click(addButton)

      // Fill in the new field with a JSON array
      const keyInput = screen.getByPlaceholderText('Field name')
      const valueInput = screen.getByPlaceholderText('Value')

      await user.type(keyInput, 'array_field')
      await user.click(valueInput)
      await user.paste('["a","b","c"]')

      // Click add button
      const confirmButton = screen.getByText('Add')
      await user.click(confirmButton)

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.array_field).toEqual(['a', 'b', 'c'])
    })
  })

  describe('Empty/Undefined Values', () => {
    it('should handle empty frontmatter', () => {
      render(<FrontmatterEditor frontmatter={{}} onChange={defaultProps.onChange} />)

      // Should render with empty values
      expect(screen.getByPlaceholderText('Document title')).toHaveValue('')
    })

    it('should handle undefined tags', () => {
      render(
        <FrontmatterEditor
          frontmatter={{ title: 'Test' }}
          onChange={defaultProps.onChange}
        />
      )

      // Should render tags section but with no tags
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Add tag (press Enter)')
      ).toBeInTheDocument()
    })

    it('should handle clearing sidebar_position', async () => {
      const user = userEvent.setup()
      renderControlledFrontmatterEditor()

      const positionInput = screen.getByDisplayValue('1')
      await user.clear(positionInput)

      expect(defaultProps.onChange).toHaveBeenCalled()
      const lastCall =
        defaultProps.onChange.mock.calls[
          defaultProps.onChange.mock.calls.length - 1
        ][0]
      expect(lastCall.sidebar_position).toBeUndefined()
    })
  })
})
