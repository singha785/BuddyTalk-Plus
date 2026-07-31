// TypeScript fallback — Metro resolves lib/webrtc.native.ts on native
// and lib/webrtc.web.ts on web at bundle time. This file is only seen
// by `tsc --noEmit`; it re-exports the browser DOM globals so the
// compiler has concrete types for RTCPeerConnection, etc.
export const RTCPeerConnection = globalThis.RTCPeerConnection;
export const RTCSessionDescription = globalThis.RTCSessionDescription;
export const RTCIceCandidate = globalThis.RTCIceCandidate;
export const MediaStream = globalThis.MediaStream;
export const mediaDevices = navigator.mediaDevices;
