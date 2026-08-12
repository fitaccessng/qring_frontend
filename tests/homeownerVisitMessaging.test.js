import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/apiClient", () => ({
  ApiError: class ApiError extends Error {},
  apiRequest: vi.fn(),
  apiUpload: vi.fn()
}));

import { apiRequest } from "../src/services/apiClient";
import { decideVisit, sendHomeownerSessionMessage } from "../src/services/homeownerService";

describe("homeowner visit messaging service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends homeowner replies into the visit message thread", async () => {
    apiRequest.mockResolvedValue({ data: { id: "msg-1", text: "Please deny entry." } });

    const result = await sendHomeownerSessionMessage("session-1", "Please deny entry.");

    expect(apiRequest).toHaveBeenCalledWith("/homeowner/messages/session-1", {
      method: "POST",
      body: JSON.stringify({ text: "Please deny entry." })
    });
    expect(result).toEqual({ id: "msg-1", text: "Please deny entry." });
  });

  it("routes homeowner rejection decisions back to gateman chat", async () => {
    apiRequest.mockResolvedValue({ data: { status: "rejected" } });

    const result = await decideVisit("session-1", "reject", {
      communicationChannel: "chat",
      communicationTarget: "gateman"
    });

    expect(apiRequest).toHaveBeenCalledWith("/homeowner/visits/session-1/decision", {
      method: "POST",
      body: JSON.stringify({
        action: "reject",
        communicationChannel: "chat",
        communicationTarget: "gateman"
      })
    });
    expect(result).toEqual({ status: "rejected" });
  });
});
