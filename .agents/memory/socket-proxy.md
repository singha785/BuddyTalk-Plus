---
name: Socket.IO path and proxy routing
description: Why Socket.IO must use /api/socket.io path in this monorepo
---

The Replit reverse proxy routes traffic by path prefix. Our api-server is mapped to `/api`. Socket.IO's default path is `/socket.io` which would NOT be routed to the api-server.

**Rule:** Always initialize Socket.IO with `path: "/api/socket.io"`:
```typescript
new Server(httpServer, { path: "/api/socket.io", ... })
```

**Mobile client must match:**
```typescript
io(url, { path: "/api/socket.io", ... })
```

**Why:** Without this, Socket.IO handshakes go to `/socket.io` which isn't routed to the api-server by the Replit proxy, causing silent connection failures.

**How to apply:** Any time Socket.IO is initialized or a new socket client is created in this project.
