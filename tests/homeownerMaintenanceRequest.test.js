import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/apiClient', () => ({
  apiRequest: vi.fn()
}));

import { createHomeownerMaintenanceRequest } from '../src/services/homeownerService';
import { apiRequest } from '../src/services/apiClient';

describe('homeowner maintenance request service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to the correct homeowner maintenance request endpoint', async () => {
    apiRequest.mockResolvedValue({ data: { id: 'request-1', status: 'created' } });

    const payload = { title: 'Leaking gate', description: 'The gate motor is stuck.' };
    const result = await createHomeownerMaintenanceRequest(payload);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/homeowner/maintenance-requests', expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }));
    expect(result).toEqual({ id: 'request-1', status: 'created' });
  });
});
