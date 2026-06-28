import { describe, it, expect, beforeEach } from 'vitest';
import { set, get, del, clear } from '../cache';

describe('Cache Functions', () => {
  beforeEach(() => {
    clear();
  });

  describe('set and get', () => {
    it('stores and retrieves a value', () => {
      set('key1', 'value1');
      const result = get('key1');
      expect(result).toBe('value1');
    });

    it('returns null for non-existent key', () => {
      const result = get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('ttl', () => {
    it('expires after ttl', async () => {
      set('key1', 'value1', 10);
      expect(get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(get('key1')).toBeNull();
    });
  });

  describe('del', () => {
    it('removes a key', () => {
      set('key1', 'value1');
      del('key1');
      expect(get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all keys', () => {
      set('key1', 'value1');
      set('key2', 'value2');
      clear();
      expect(get('key1')).toBeNull();
      expect(get('key2')).toBeNull();
    });
  });
});