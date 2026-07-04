import { describe, it, expect } from 'vitest';
import { cn, validateSortField, validateSortDirection, buildSafeOrderBy, buildInClausePlaceholders } from '../utils';

describe('Utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
    });

    it('handles tailwind css classes', () => {
      expect(cn('px-2 py-1', 'bg-red-500')).toBe('px-2 py-1 bg-red-500');
    });
  });

  describe('SQL Safety Utilities', () => {
    describe('validateSortField', () => {
      it('accepts valid sort fields', () => {
        expect(validateSortField('sort_order')).toBe('sort_order');
        expect(validateSortField('date')).toBe('date');
        expect(validateSortField('deadline')).toBe('deadline');
        expect(validateSortField('priority')).toBe('priority');
      });

      it('throws for invalid sort fields', () => {
        expect(() => validateSortField('invalid_field')).toThrow('Invalid sort field');
        expect(() => validateSortField('; DROP TABLE tasks')).toThrow('Invalid sort field');
      });
    });

    describe('validateSortDirection', () => {
      it('accepts valid directions', () => {
        expect(validateSortDirection('asc')).toBe('asc');
        expect(validateSortDirection('desc')).toBe('desc');
      });

      it('throws for invalid directions', () => {
        expect(() => validateSortDirection('invalid')).toThrow('Invalid sort direction');
      });
    });

    describe('buildSafeOrderBy', () => {
      it('builds valid ORDER BY clause', () => {
        expect(buildSafeOrderBy('date', 'asc')).toBe('date asc');
        expect(buildSafeOrderBy('priority', 'desc')).toBe('priority desc');
      });

      it('uses defaults when no arguments provided', () => {
        expect(buildSafeOrderBy()).toBe('sort_order asc');
      });
    });

    describe('buildInClausePlaceholders', () => {
      it('generates correct placeholder strings', () => {
        expect(buildInClausePlaceholders(1)).toBe('?');
        expect(buildInClausePlaceholders(3)).toBe('?,?,?');
        expect(buildInClausePlaceholders(5)).toBe('?,?,?,?,?');
      });

      it('throws for invalid counts', () => {
        expect(() => buildInClausePlaceholders(0)).toThrow('Count must be positive');
        expect(() => buildInClausePlaceholders(-1)).toThrow('Count must be positive');
      });
    });
  });
});