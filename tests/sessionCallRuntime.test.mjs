import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRemoteTrackEvent,
  bindStreamToMediaElement,
  remoteMediaIsAttached,
  shouldClearIncomingCallOnTerminalEvent,
  shouldStartCallTimer,
  stopStreamTracks
} from "../src/services/sessionCallRuntime.js";

test("remote media and timer gating require an attached stream", () => {
  const stream = {
    getAudioTracks() {
      return [{ enabled: true }];
    },
    getVideoTracks() {
      return [];
    }
  };

  assert.equal(remoteMediaIsAttached(stream), true);
  assert.equal(shouldStartCallTimer({ callState: "connecting", remoteMediaAttached: true }), false);
  assert.equal(shouldStartCallTimer({ callState: "connected", remoteMediaAttached: false }), false);
  assert.equal(shouldStartCallTimer({ callState: "connected", remoteMediaAttached: true }), true);
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
  assert.deepEqual(stopped.sort(), ["audio", "video"]);
  assert.equal(shouldClearIncomingCallOnTerminalEvent("ended"), true);
  assert.equal(shouldClearIncomingCallOnTerminalEvent("rejected"), true);
  assert.equal(shouldClearIncomingCallOnTerminalEvent("failed"), true);
  assert.equal(shouldClearIncomingCallOnTerminalEvent("incoming"), false);
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
  assert.equal(localElement.srcObject, stream);
  assert.equal(localElement.muted, true);

  const track = { kind: "video" };
  const result = applyRemoteTrackEvent(stream, { track, streams: [] });
  assert.equal(result.remoteStream, stream);
  assert.equal(stream._addedTrack, track);
  assert.equal(result.remoteMediaAttached, true);
  assert.equal(result.hasVideo, true);
});
