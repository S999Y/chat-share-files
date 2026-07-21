# Chat and File Share

A complete full-stack real-time web application featuring isolated chat rooms and password-protected file sharing. Users can instantly create rooms, connect with classmates or teams, and exchange messages and attachments with actual live socket streaming.

---

## 🚀 Key Features

1. **JWT & Session Security**
   - Hashed passwords using `bcrypt`.
   - Token-secured private endpoints (`Bearer <token>`).
   - Automated routing guards (Protected vs Public routes).

2. **Real-Time Rooms Isolated Chat**
   - Instant creation of rooms with random, unique **6-digit access codes**.
   - Multiple users can enter the same room simultaneously.
   - Dynamic online user trackers & join/leave logs inside the feed.
   - Real-time typing indicators ("Jane is typing...").

3. **Secure File Sharing**
   - Supports images, videos, PDFs, zip archives, and documents.
   - Set **optional passwords** on uploads (securely hashed with `bcrypt`).
   - Requires password input for downloads or inline previewing of secure attachments.
   - Live **upload progress bars** with real axios streaming trackers.
   - Maximum file size enforcement (defaults to 10MB, configurable via `.env`).

4. **Robust Dual-Database Storage Architecture**
   - **Persistent Storage Mode**: Automatically binds to Mongoose & MongoDB Atlas if a `MONGODB_URI` exists in your variables.
   - **Demo Sandbox Mode**: Automatically activates a highly performant in-memory fallback if no URI is supplied, ensuring the application is fully functional and previewable out of the box!

---

## 🛠️ Tech Stack

- **Frontend**: React.js (TypeScript/ESM), React Router, Axios, Socket.io Client, Lucide React, Tailwind CSS.
- **Backend**: Node.js, Express.js, Socket.io, Multer, Mongoose, JSONWebTokens, Bcrypt, Tsx.

---

## 📂 Project Directory Structure

```
chat-file-share/
├── src/
│   ├── api/
│   │   └── client.ts            # Configured Axios instance with interceptors
│   ├── components/
│   │   ├── FileCard.tsx         # Direct downloads, lock prompts, and media previews
│   │   └── UploadModal.tsx      # Drag-and-drop file picker with password options
│   ├── context/
│   │   ├── AuthContext.tsx      # Handles JWT logs, profile fetch, and server mode
│   │   └── SocketContext.tsx    # Live WebSocket subscription manager
│   ├── pages/
│   │   ├── Login.tsx            # Login with credential validations
│   │   ├── Register.tsx         # SignUp for new members
│   │   ├── Dashboard.tsx        # Room creation and room-code joining dashboard
│   │   ├── ChatRoom.tsx         # Full-pane chat console, sidebar, and attachment controls
│   │   ├── Profile.tsx          # Account metadata and Atlas connectivity steps
│   │   └── NotFound.tsx         # 404 page
│   ├── server/
│   │   ├── controllers/         # MVC controllers (Auth, Room, File)
│   │   ├── middleware/          # Security upload limits and Auth verification
│   │   ├── models/              # Mongoose collection schemas
│   │   ├── routes/              # Express API endpoint definitions
│   │   └── sockets/             # Socket.io event triggers and tracking
│   ├── App.tsx                  # Client router routes and security guards
│   ├── main.tsx                 # Frontend bootstrap
│   ├── index.css                # Global styles
│   └── types.ts                 # Shared TypeScript models
├── server.ts                    # Unified fullstack entry point (Vite Dev + Express API)
├── package.json                 # Dependency manifests
└── README.md                    # Documentation
```

---

## 🔐 Environment Configurations

Declare these environment variables in your workspace secrets or locally inside a `.env` file:

```env
# MongoDB Atlas Database URI (Optional - defaults to Memory Sandbox mode if empty)
MONGODB_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/chat-share"

# Secret Key used to encrypt JWT tokens
JWT_SECRET="chat-file-share-secret-key-super-secret"

# Max Upload Size (in Bytes) - 10MB default
MAX_FILE_SIZE="10485760"
```

---

## 🔌 API Endpoints Documentation

All endpoints expect JSON payloads and return JSON, with the exception of direct file downloads.

### 🔑 Authentication (`/api/auth`)
- `POST /register` - Registers a new user. Expects `{ username, email, password }`.
- `POST /login` - Sign-In. Returns JWT token and `{ user }` profile. Expects `{ email, password }`.
- `GET /me` - Fetches authenticated profile details. (Requires Bearer Token).

### 💬 Chat Rooms (`/api/rooms`) (Requires Bearer Token)
- `POST /create` - Spawns a new chat room. Expects `{ name }`. Returns `{ code, name, creatorName }`.
- `POST /join` - Verifies room code validity. Expects `{ code }`.
- `GET /all` - Lists all active platform rooms.
- `GET /:code` - Fetches metadata for a specific room.
- `GET /:code/messages` - Pulls historical messages for the room.
- `GET /:code/files` - Pulls list of all files shared inside the room.

### 📁 File Share (`/api/files`)
- `POST /upload` - Uploads a file (multipart/form-data). Option for `{ password }`. (Requires Bearer Token).
- `GET /:id/metadata` - Fetches uploader, timestamp, and password status. (Requires Bearer Token).
- `POST /:id/verify` - Validates file passwords before access. Expects `{ password }`. (Requires Bearer Token).
- `GET /:id/download` - Serves or downloads direct binary contents. (Accepts `?password=xxx` or custom headers).

---

## ⚡ Socket.io Events Documentation

Socket communication isolates messages by room IDs.

### Client-to-Server (Emit)
- `join-room` - Subscribes to room feeds. Payload: `{ roomId, userId, username }`.
- `leave-room` - Unsubscribes from room feeds. Payload: `{ roomId, userId, username }`.
- `send-message` - Dispatches a text/file chat message. Payload: `{ roomId, userId, username, text, fileId? }`.
- `typing` - Broadcasters current typing state. Payload: `{ roomId, username, isTyping }`.

### Server-to-Client (On)
- `online-users` - Received updated list of active users: `Array<{ username, socketId }>` in the current room.
- `user-joined` - Broadcasts a system join notification to other room members.
- `user-left` - Broadcasts a system leave notification to other room members.
- `receive-message` - Dispatches new incoming message details instantly to active subscribers.
- `user-typing` - Delivers active typing indicators.
