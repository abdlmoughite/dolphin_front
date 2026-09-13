import { describe, expect, it } from 'vitest';
import { api, mediaUrl } from './api';

describe('api client configuration', () => {
  it('normalizes the base URL with exactly one API prefix', () => {
    expect(api.defaults.baseURL).toMatch(/\/api\/v1$/);
    expect(api.defaults.baseURL).not.toContain('/api/v1/api/v1');
  });

  it('builds media URLs from the API host', () => {
    expect(mediaUrl('/media/products/item.png')).toMatch(/\/media\/products\/item\.png$/);
    expect(mediaUrl('/media/products/item.png')).not.toContain('/api/v1/media/');
    expect(mediaUrl('https://cdn.example.test/item.png')).toBe('https://cdn.example.test/item.png');
  });
});
