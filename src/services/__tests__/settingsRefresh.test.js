import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../apiClient", () => ({
  apiRequest: vi.fn()
}));

import { apiRequest } from "../apiClient";
import { getEstateSettingsSummary, invalidateEstateServiceCache } from "../estateService";
import {
  getHomeownerSettings,
  invalidateHomeownerSettingsCache
} from "../homeownerSettingsService";

describe("settings refresh throttling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ data: { profile: { fullName: "Example" }, estates: [] } });
    invalidateEstateServiceCache();
    invalidateHomeownerSettingsCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deduplicates and throttles estate settings refreshes", async () => {
    const first = await getEstateSettingsSummary({ force: true });
    const second = await getEstateSettingsSummary({ force: true });

    expect(first).toEqual(second);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/estate/settings-summary", { noCache: true });

    vi.advanceTimersByTime(60_001);
    await getEstateSettingsSummary({ force: true });

    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it("deduplicates and throttles homeowner settings refreshes", async () => {
    const first = await getHomeownerSettings({ force: true });
    const second = await getHomeownerSettings({ force: true });

    expect(first).toEqual(second);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/homeowner/settings", { noCache: true });

    vi.advanceTimersByTime(60_001);
    await getHomeownerSettings({ force: true });

    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it("allows settings screens to bypass the refresh cooldown", async () => {
    await getHomeownerSettings({ force: true });
    await getHomeownerSettings({ force: true, bypassCooldown: true });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenLastCalledWith("/homeowner/settings", { noCache: true });

    apiRequest.mockClear();
    invalidateEstateServiceCache();
    await getEstateSettingsSummary({ force: true });
    await getEstateSettingsSummary({ force: true, bypassCooldown: true });

    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest).toHaveBeenLastCalledWith("/estate/settings-summary", { noCache: true });
  });

  it("backs off failed forced estate requests instead of repeating them", async () => {
    const rateLimitError = new Error("Too many requests");
    apiRequest.mockRejectedValueOnce(rateLimitError);

    await expect(getEstateSettingsSummary({ force: true })).rejects.toBe(rateLimitError);
    await expect(getEstateSettingsSummary({ force: true })).rejects.toBe(rateLimitError);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});