import { describe, expect, it } from "vitest";
import {
  mergeSecurityMessages,
  mergeRealtimeMessageIntoConversation,
  normalizeSecurityMessage,
  updateThreadFromRealtimeMessage
} from "./securityMessagesRealtime.js";

describe("security inbox realtime merge", () => {
  it("appends a live message and updates matching persisted payloads without duplicating", () => {
    const existing = [{
      id: "msg-1",
      sessionId: "session-9",
      text: "Existing message",
      senderType: "security",
      at: "2024-01-01T00:00:00.000Z"
    }];

    const next = mergeRealtimeMessageIntoConversation(existing, {
      id: "msg-2",
      sessionId: "session-9",
      text: "New live update",
      senderType: "visitor",
      at: "2024-01-01T00:01:00.000Z",
      clientId: "client-42"
    });

    expect(next).toHaveLength(2);
    expect(next[1].text).toBe("New live update");

    const duplicate = mergeRealtimeMessageIntoConversation(next, {
      id: "msg-2",
      sessionId: "session-9",
      text: "New live update",
      senderType: "visitor",
      at: "2024-01-01T00:02:00.000Z",
      clientId: "client-42",
      persisted: true
    });

    expect(duplicate).toHaveLength(2);
    expect(duplicate[1].text).toBe("New live update");
    expect(duplicate[1].persisted).toBe(true);
  });

  it("normalizes socket envelopes that use role and timestamp fields", () => {
    const next = mergeRealtimeMessageIntoConversation([], {
      eventId: "event-1",
      id: "msg-1",
      sessionId: "session-9",
      body: "QRING SECURITY DEBUG 002",
      role: "homeowner",
      timestamp: "2024-01-01T00:03:00.000Z"
    });

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      id: "msg-1",
      sessionId: "session-9",
      text: "QRING SECURITY DEBUG 002",
      senderType: "homeowner",
      at: "2024-01-01T00:03:00.000Z"
    });
  });

  it("normalizes persisted REST rows that use snake_case fields", () => {
    const message = normalizeSecurityMessage({
      id: "msg-3",
      session_id: "session-9",
      body: "Historical homeowner reply",
      sender_type: "homeowner",
      sender_id: "homeowner-1",
      created_at: "2024-01-01T00:02:00.000Z"
    });

    expect(message).toMatchObject({
      id: "msg-3",
      sessionId: "session-9",
      senderId: "homeowner-1",
      senderType: "homeowner",
      senderRole: "homeowner",
      text: "Historical homeowner reply",
      at: "2024-01-01T00:02:00.000Z"
    });
  });

  it("merges REST history with live messages instead of replacing either side", () => {
    const existing = [{
      id: "live-1",
      sessionId: "session-9",
      text: "Live message while history is loading",
      senderType: "homeowner",
      at: "2024-01-01T00:03:00.000Z"
    }];

    const next = mergeSecurityMessages(existing, [
      {
        id: "old-1",
        session_id: "session-9",
        body: "Old message",
        sender_type: "security",
        created_at: "2024-01-01T00:01:00.000Z"
      },
      {
        id: "live-1",
        session_id: "session-9",
        body: "Live message while history is loading",
        sender_type: "homeowner",
        created_at: "2024-01-01T00:03:00.000Z"
      }
    ]);

    expect(next).toHaveLength(2);
    expect(next.map((message) => message.id)).toEqual(["old-1", "live-1"]);
    expect(next[0].text).toBe("Old message");
  });

  it("updates the thread preview for an inactive conversation while preserving unread state", () => {
    const threads = [
      { id: "session-1", last: "First", unread: 0, updatedAt: "2024-01-01T00:00:00.000Z" },
      { id: "session-2", last: "Old", unread: 1, updatedAt: "2024-01-01T00:00:00.000Z" }
    ];

    const next = updateThreadFromRealtimeMessage(threads, {
      sessionId: "session-2",
      text: "Incoming visitor reply",
      at: "2024-01-01T00:05:00.000Z"
    }, "session-1");

    expect(next[0].id).toBe("session-2");
    expect(next[0].last).toBe("Incoming visitor reply");
    expect(next[0].unread).toBe(2);
    expect(next[1].id).toBe("session-1");
  });

  it("matches realtime replies against the canonical session_id when row id differs", () => {
    const threads = [
      { id: "thread-row-1", session_id: "session-1", last: "First", unread: 0, updatedAt: "2024-01-01T00:00:00.000Z" },
      { id: "thread-row-2", session_id: "session-2", last: "Old", unread: 0, updatedAt: "2024-01-01T00:00:00.000Z" }
    ];

    const next = updateThreadFromRealtimeMessage(threads, {
      sessionId: "session-2",
      text: "LIVE HOMEOWNER REPLY 001",
      senderType: "homeowner",
      at: "2024-01-01T00:05:00.000Z"
    }, "session-1");

    expect(next[0]).toMatchObject({
      id: "thread-row-2",
      session_id: "session-2",
      last: "LIVE HOMEOWNER REPLY 001",
      unread: 1
    });
  });
});
