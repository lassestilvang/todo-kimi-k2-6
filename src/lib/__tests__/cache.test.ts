import { describe, it, expect, beforeEach } from 'vitest';
import { set, get, del, clear } from '../cache';

describe('Cache Functions', () => {
  beforeEach(async () => {
    await clear();
  });

  describe('set and get', () => {
    it('stores and retrieves a value', async () => {
      await set('key1', 'value1');
      const result = await get('key1');
      expect(result).toBe('value1');
    });

    it('returns null for non-existent key', async () => {
      const result = await get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('ttl', () => {
    it('expires after ttl', async () => {
      await set('key1', 'value1', 10);
      expect(await get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 20));
      expect(await get('key1')).toBeNull();
    });
  });

  describe('del', () => {
    it('removes a key', async () => {
      await set('key1', 'value1');
      await del('key1');
      expect(await get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all keys', async () => {
      await set('key1', 'value1');
      await set('key2', 'value2');
      await clear();
      expect(await get('key1')).toBeNull();
      expect(await get('key2')).toBeNull();
    });
  });
});