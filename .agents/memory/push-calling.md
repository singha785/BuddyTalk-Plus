---
name: Push-based calling system
description: Architecture for push-based caller→receiver calling model in BuddyTalk+, replacing the old simultaneous-queue system.
---

**Old system:** Both users had to join a queue simultaneously; server matched first two in queue.

**New system:** Caller pushes a call to a random available receiver.

Server-side events (socket/index.ts):
- `call_user` (client→server): Caller wants to start a call
- `cancel_call` (client→server): Caller cancels pending attempt
- `call_accept { callId }` (client→server): Receiver accepts
- `call_reject { callId }` (client→server): Receiver rejects (server tries next user automatically)
- `set_online_status { online }` (client→server): Toggle wantsCalls flag

Server-side emits:
- `incoming_call` → sent to potential receiver with caller info + callId
- `call_ringing { callId }` → sent to caller when receiver's device is ringing
- `call_matched` → sent to BOTH when receiver accepts (same payload as old `matched`)
- `no_users_available` → sent to caller when no eligible receiver exists
- `call_cancelled` → sent to receiver when caller disconnects/cancels

Server state: `activeCallAttempts Map<callId, CallAttempt>` tracks `callerSocketId`, `receiverSocketId`, `triedSocketIds` (Set of already-tried sockets to avoid re-ringing rejecters).

ConnectedUser has `wantsCalls: boolean` (default true) for online/offline toggle.

Client (practice.tsx) stages: `searching` → `ringing` → `in-call` → `ended`.
Receiver mode: navigate to `/practice?mode=incoming` after accepting via IncomingCallOverlay; screen listens for `call_matched` to enter in-call stage.

**Why:** Old queue system required perfect timing — both users needed to press "Start" simultaneously. New system allows one user to call any available user, like a real phone call.

**How to apply:** IncomingCallOverlay is mounted globally in `_layout.tsx` inside SocketProvider so it always receives incoming_call events regardless of current screen.
