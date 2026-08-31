import { test, expect } from "vitest";
import {
  applyRemoteTrackEvent,
  bindStreamToMediaElement,
  remoteMediaIsAttached,
  shouldClearIncomingCallOnTerminalEvent,
  shouldStartCallTimer,
  stopStreamTracks
} from "../src/services/sessionCallRuntime.js";
import { buildIncomingCallAcceptIntent } from "../src/components/GlobalIncomingCallOverlay.jsx";

test("remote media and timer gating require an attached stream", () => {
  const stream = {
    getAudioTracks() {
      return [{ enabled: true }];
    },
    getVideoTracks() {
      return [];
    }
  };

  expect(remoteMediaIsAttached(stream)).toBe(true);
  expect(shouldStartCallTimer({ callState: "connecting", remoteMediaAttached: true })).toBe(false);
  expect(shouldStartCallTimer({ callState: "connected", remoteMediaAttached: false })).toBe(false);
  expect(shouldStartCallTimer({ callState: "connected", remoteMediaAttached: true })).toBe(true);
});

test("stopStreamTracks stops every local track and terminal events clear the incoming call", () => {
  const stopped = [];
  const stream = {
    getTracks() {
      return [
        { stop() { stopped.push("audio"); } },
        { stop() { stopped.push("video"); } }
      ];
    }
  };

  stopStreamTracks(stream);
  expect(stopped.sort()).toEqual(["audio", "video"]);
  expect(shouldClearIncomingCallOnTerminalEvent("ended")).toBe(true);
  expect(shouldClearIncomingCallOnTerminalEvent("rejected")).toBe(true);
  expect(shouldClearIncomingCallOnTerminalEvent("failed")).toBe(true);
  expect(shouldClearIncomingCallOnTerminalEvent("incoming")).toBe(false);
});

test("local and remote media bindings attach streams and track remote events", () => {
  const localElement = {};
  const stream = {
    getAudioTracks() {
      return [];
    },
    getVideoTracks() {
      return [{ enabled: true }];
    },
    addTrack(track) {
      this._addedTrack = track;
    }
  };

  bindStreamToMediaElement(localElement, stream, { muted: true });
  expect(localElement.srcObject).toBe(stream);
  expect(localElement.muted).toBe(true);

  const track = { kind: "video" };
  const result = applyRemoteTrackEvent(stream, { track, streams: [] });
  expect(result.remoteStream).toBe(stream);
  expect(stream._addedTrack).toBe(track);
  expect(result.remoteMediaAttached).toBe(true);
  expect(result.hasVideo).toBe(true);
});

test("incoming call accept intent preserves routing and WebRTC metadata", () => {
  const intent = buildIncomingCallAcceptIntent({
    sessionId: "session-1",
    callSessionId: "call-session-1",
    callId: "call-1",
    callerId: "homeowner-1",
    recipientId: "visitor-1",
    estateId: "estate-1",
    callType: "video",
    communicationTarget: "visitor",
    visitorId: "visitor-session-user",
    eventId: "event-1",
    roomName: "room-1",
    callerRole: "homeowner",
    callerName: "Ada"
  });

  expect(intent).toMatchObject({
    sessionId: "session-1",
    callSessionId: "call-session-1",
    callId: "call-1",
    callerId: "homeowner-1",
    recipientId: "visitor-1",
    estateId: "estate-1",
    callType: "video",
    communicationTarget: "visitor",
    visitorId: "visitor-session-user",
    eventId: "event-1",
    roomName: "room-1",
    callerRole: "homeowner",
    callerName: "Ada",
    hasVideo: true
  });
});
