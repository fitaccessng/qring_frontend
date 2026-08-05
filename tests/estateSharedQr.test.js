import { beforeEach, describe, it, expect, vi } from 'vitest';

vi.mock('../src/services/apiClient', () => ({
  apiRequest: vi.fn()
}));

import { listEstateSharedQrs, createEstateSharedQr, invalidateEstateServiceCache } from '../src/services/estateService';
import { apiRequest } from '../src/services/apiClient';

describe('estate shared QR caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateEstateServiceCache();
  });

  it('caches GET results and respects force/invalidate', async () => {
    const estateId = 'estate-1';

    apiRequest.mockImplementation(async (path, options = {}) => {
      if (path.startsWith('/estate/shared-qr') && (!options.method || options.method === 'GET')) {
        return { data: [{ id: 'qr-1' }] };
      }
      if (path === '/estate/shared-qr' && options.method === 'POST') {
        return { data: { id: 'qr-1' } };
      }
      return { data: null };
    });

    const first = await listEstateSharedQrs(estateId);
    expect(apiRequest).toHaveBeenCalledTimes(1);

    const second = await listEstateSharedQrs(estateId);
    expect(apiRequest).toHaveBeenCalledTimes(1); // cached

    await createEstateSharedQr(estateId);
    expect(apiRequest).toHaveBeenCalledWith('/estate/shared-qr', expect.objectContaining({ method: 'POST' }));

    const third = await listEstateSharedQrs(estateId);
    expect(apiRequest).toHaveBeenCalledTimes(3); // GET, POST, GET
  });
});
