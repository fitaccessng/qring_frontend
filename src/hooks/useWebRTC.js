import { useRef, useState } from "react";

export function useWebRTC() {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const [callState, setCallState] = useState("idle");

  const init = async () => {
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });
    peerRef.current = new RTCPeerConnection();
    localStreamRef.current.getTracks().forEach((track) => {
      peerRef.current.addTrack(track, localStreamRef.current);
    });
    setCallState("ready");
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    localStreamRef.current = null;
    peerRef.current = null;
    setCallState("ended");
  };

  return {
    callState,
    peer: peerRef.current,
    localStream: localStreamRef.current,
    init,
    cleanup
  };
}
