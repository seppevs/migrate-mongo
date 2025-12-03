import { describe, it, expect } from 'vitest';
import moduleLoader from '../../lib/utils/module-loader.js';

describe('module-loader', () => {
  describe('require', () => {
    it('should load CommonJS modules', () => {
      const result = moduleLoader.require('path');
      expect(result).toBeDefined();
      expect(typeof result.join).toBe('function');
    });
  });

  describe('import', () => {
    it('should load ES modules', async () => {
      const result = await moduleLoader.import('path');
      expect(result).toBeDefined();
      expect(typeof result.join).toBe('function');
    });
  });
});
