import { test, expect } from "vitest";
import { createNotificationManager } from "../src/services/notificationManager.js";

test("incoming call overlay ignores non-call realtime payloads with session ids", () => {
  const manager = createNotificationManager();

  const visitorRequest = manager.ingestIncomingCall({
    data: {
      kind: "visitor.request",
      sessionId: "session-1",
      eventId: "request-1",
      visitorName: "John Doe",
      message: "New visitor request"
    }
  });

  expect(visitorRequest).toBeNull();
});

test("incoming call overlay accepts only explicit incoming call payloads", () => {
  const manager = createNotificationManager();

  const incoming = manager.ingestIncomingCall({
    eventName: "incoming-call",
    data: {
      sessionId: "session-1",
      callSessionId: "call-1",
      callerName: "John Doe",
      type: "audio"
    }
  });

  expect(incoming).toMatchObject({
    sessionId: "session-1",
    callSessionId: "call-1",
    type: "audio",
    hasVideo: false
  });
});
