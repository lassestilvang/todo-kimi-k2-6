import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../card';

describe('Card Component', () => {
  it('renders card with default size', () => {
    render(
      <Card>
        <CardContent>Test content</CardContent>
      </Card>
    );
    expect(screen.getByText('Test content')).toBeDefined();
  });

  it('renders card with custom className', () => {
    render(
      <Card className="custom-class">
        <CardContent>Test content</CardContent>
      </Card>
    );
    const card = screen.getByText('Test content').closest('[data-slot="card"]');
    expect(card).toBeDefined();
  });

  it('renders card with sm size', () => {
    render(
      <Card size="sm">
        <CardContent>Test content</CardContent>
      </Card>
    );
    const card = screen.getByText('Test content').closest('[data-slot="card"]');
    expect(card?.getAttribute('data-size')).toBe('sm');
  });
});

describe('CardHeader', () => {
  it('renders card header', () => {
    render(
      <CardHeader>
        <CardTitle>Test Title</CardTitle>
      </CardHeader>
    );
    expect(screen.getByText('Test Title')).toBeDefined();
  });
});

describe('CardTitle', () => {
  it('renders card title', () => {
    render(<CardTitle>Test Title</CardTitle>);
    expect(screen.getByText('Test Title')).toBeDefined();
  });
});

describe('CardDescription', () => {
  it('renders card description', () => {
    render(<CardDescription>Test description</CardDescription>);
    expect(screen.getByText('Test description')).toBeDefined();
  });
});

describe('CardContent', () => {
  it('renders card content', () => {
    render(<CardContent>Test content</CardContent>);
    expect(screen.getByText('Test content')).toBeDefined();
  });
});

describe('CardFooter', () => {
  it('renders card footer', () => {
    render(
      <CardFooter>
        <span>Footer content</span>
      </CardFooter>
    );
    expect(screen.getByText('Footer content')).toBeDefined();
  });
});