---
name: WebRTC remote audio fix
description: Remote audio stream arrives via RTCPeerConnection.ontrack but is never heard without explicitly creating and playing an <audio> element on web.
---

The bug: `pc.ontrack` fires and delivers `event.streams[0]`, but calling an `onRemoteStream` callback alone does nothing — there is no automatic playback. On web, you must:

1. Create `document.createElement('audio')` with `autoplay = true`
2. Append it to `document.body` (hidden via CSS)
3. Set `audio.srcObject = stream`
4. Call `audio.play().catch(() => {})` (autoplay policy may block it, but usually fine after mic permission)

Keep a ref to the audio element and clean it up (`srcObject = null`, `.remove()`) in the WebRTC cleanup function to avoid memory leaks.

**Why:** RTCPeerConnection delivers remote media tracks but does not auto-route them to speakers. A media element must be bound to the stream.

**How to apply:** In `useWebRTC.ts` — maintain `remoteAudioRef` and create/reuse the audio element inside the `ontrack` handler. Clean up in `cleanup()`.
