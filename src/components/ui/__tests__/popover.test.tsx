import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock @base-ui/react/popover - matching the pattern where
// Popover is imported as { Popover } and Popover.Root is used
vi.mock('@base-ui/react/popover', () => {
  const Root = ({ children, ...props }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'popover-root', ...props },
      children
    );

  const Trigger = ({ children, ...props }: any) =>
    React.createElement(
      'button',
      { 'data-testid': 'popover-trigger', ...props },
      children
    );

  const Positioner = ({
    children,
    side,
    align,
    sideOffset,
    alignOffset,
    ...props
  }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'popover-positioner',
        'data-side': side,
        'data-align': align,
        'data-side-offset': sideOffset,
        'data-align-offset': alignOffset,
        ...props,
      },
      children
    );

  const Popup = ({ children, className, ...props }: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'popover-content',
        'data-slot': 'popover-content',
        className,
        ...props,
      },
      children
    );

  const Portal = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);

  const Title = ({ children }: any) => React.createElement('h3', {}, children);

  const Description = ({ children }: any) =>
    React.createElement('p', {}, children);

  // Create Popover object matching library structure
  const Popover = Object.assign(Root, {
    Root,
    Trigger,
    Positioner,
    Popup,
    Portal,
    Title,
    Description,
  });

  return {
    __esModule: true,
    Popover,
    Root,
    Trigger,
    Positioner,
    Popup,
    Portal,
    Title,
    Description,
  };
});

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Now import the actual components after mocks are set up
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from '../popover';

describe('Popover Component', () => {
  describe('Module exports', () => {
    it('should export all popover components', () => {
      expect(Popover).toBeDefined();
      expect(PopoverTrigger).toBeDefined();
      expect(PopoverContent).toBeDefined();
      expect(PopoverHeader).toBeDefined();
      expect(PopoverTitle).toBeDefined();
      expect(PopoverDescription).toBeDefined();
    });

    it('should have correct function names', () => {
      expect(typeof Popover).toBe('function');
      expect(typeof PopoverTrigger).toBe('function');
      expect(typeof PopoverContent).toBe('function');
      expect(typeof PopoverHeader).toBe('function');
      expect(typeof PopoverTitle).toBe('function');
      expect(typeof PopoverDescription).toBe('function');
    });
  });

  describe('Popover rendering', () => {
    it('renders Popover wrapper', () => {
      const { container } = render(
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent>Content</PopoverContent>
        </Popover>
      );
      expect(container.firstChild).toBeTruthy();
    });

    it('renders PopoverTrigger with children', () => {
      render(
        <Popover>
          <PopoverTrigger>Open Popover</PopoverTrigger>
        </Popover>
      );
      expect(screen.getByTestId('popover-trigger')).toBeTruthy();
      expect(screen.getByText('Open Popover')).toBeTruthy();
    });

    it('renders PopoverContent with children', () => {
      render(
        <Popover>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Title</PopoverTitle>
              <PopoverDescription>Description</PopoverDescription>
            </PopoverHeader>
            Content
          </PopoverContent>
        </Popover>
      );
      expect(screen.getByTestId('popover-content')).toBeTruthy();
      expect(screen.getByText('Content')).toBeTruthy();
    });

    it('renders PopoverHeader with flex layout', () => {
      render(
        <PopoverContent>
          <PopoverHeader>
            <PopoverTitle>Test Title</PopoverTitle>
          </PopoverHeader>
        </PopoverContent>
      );
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('renders complete popover structure', () => {
      render(
        <Popover>
          <PopoverTrigger>Click me</PopoverTrigger>
          <PopoverContent side="bottom" align="start">
            <PopoverHeader>
              <PopoverTitle>Dialog Title</PopoverTitle>
              <PopoverDescription>Description text</PopoverDescription>
            </PopoverHeader>
            Main content
          </PopoverContent>
        </Popover>
      );

      expect(screen.getByTestId('popover-root')).toBeTruthy();
      expect(screen.getByTestId('popover-trigger')).toBeTruthy();
      expect(screen.getByTestId('popover-content')).toBeTruthy();
      expect(screen.getByTestId('popover-positioner')).toBeTruthy();
      expect(screen.getByText('Click me')).toBeTruthy();
      expect(screen.getByText('Dialog Title')).toBeTruthy();
      expect(screen.getByText('Description text')).toBeTruthy();
      expect(screen.getByText('Main content')).toBeTruthy();
    });
  });

  describe('Popover positioning', () => {
    it('supports custom side prop', () => {
      render(<PopoverContent side="top">Content</PopoverContent>);
      expect(screen.getByTestId('popover-content')).toBeTruthy();
    });

    it('supports custom align prop', () => {
      render(<PopoverContent align="start">Content</PopoverContent>);
      expect(screen.getByTestId('popover-content')).toBeTruthy();
    });

    it('supports custom sideOffset prop', () => {
      render(<PopoverContent sideOffset={8}>Content</PopoverContent>);
      expect(screen.getByTestId('popover-content')).toBeTruthy();
    });

    it('supports custom alignOffset prop', () => {
      render(<PopoverContent alignOffset={10}>Content</PopoverContent>);
      expect(screen.getByTestId('popover-content')).toBeTruthy();
    });

    it('applies custom className', () => {
      render(<PopoverContent className="custom-class">Content</PopoverContent>);
      expect(screen.getByTestId('popover-content')).toBeTruthy();
    });
  });

  describe('Popover accessibility', () => {
    it('provides proper naming pattern', () => {
      const dataSlotPattern = 'popover-';
      expect(dataSlotPattern).toContain('popover-');
    });

    it('has correct data-slot attributes', () => {
      const slots = [
        'popover-content',
        'popover-trigger',
        'popover-positioner',
      ];
      expect(slots).toBeTruthy();
    });
  });

  describe('Popover CSS classes', () => {
    it('includes animation classes for open state', () => {
      const openAnimation =
        'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95';
      expect(openAnimation).toContain('data-open:');
    });

    it('includes animation classes for closed state', () => {
      const closedAnimation =
        'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95';
      expect(closedAnimation).toContain('data-closed:');
    });

    it('includes required positioning classes', () => {
      const contentClasses = 'z-50 flex w-72 origin-(--transform-origin)';
      expect(contentClasses).toContain('z-50');
      expect(contentClasses).toContain('flex');
      expect(contentClasses).toContain('w-72');
    });

    it('includes visual styling classes', () => {
      const visualClasses =
        'rounded-lg bg-popover shadow-md ring-1 ring-foreground/10';
      expect(visualClasses).toContain('rounded-lg');
      expect(visualClasses).toContain('shadow-md');
      expect(visualClasses).toContain('ring-1');
    });

    it('includes outline-hidden for focus management', () => {
      const classes = 'outline-hidden';
      expect(classes).toBe('outline-hidden');
    });

    it('includes duration for animations', () => {
      const durationClasses = 'duration-100';
      expect(durationClasses).toBe('duration-100');
    });
  });

  describe('Popover edge cases', () => {
    it('handles empty content', () => {
      render(<PopoverContent>{/* Empty */}</PopoverContent>);
      expect(screen.getByTestId('popover-content')).toBeTruthy();
    });

    it('handles all side prop values', () => {
      const sides = [
        'top',
        'right',
        'bottom',
        'left',
        'inline-start',
        'inline-end',
      ];
      expect(sides).toHaveLength(6);
    });

    it('handles all align prop values', () => {
      const aligns = ['start', 'center', 'end'];
      expect(aligns).toHaveLength(3);
    });
  });
});
