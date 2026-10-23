# Chat backend

NestJS API for 1:1 and group chat.

- **MySQL** stores users, chats, and membership.
- **Firestore** stores messages, read receipts, and each member's last-seen message.

There is no authentication layer. The assignment APIs take `userId` / `senderId` in the request, and this service trusts that value. Put a real auth gateway in front before exposing it.

## Layout

| Data | Store | Path |
| --- | --- | --- |
| Users | MySQL `users` | |
| Chats and members | MySQL `chats`, `chat_members` | Direct chats are unique on a sorted `userA:userB` key |
| Messages | Firestore | `chats/{chatId}/messages/{messageId}` |
| Read receipts | Firestore, on the message | `readBy.{userId}` = timestamp |
| Last seen | Firestore | `chats/{chatId}/lastSeen/{userId}` |

`GET /chat/:chatId/messages` returns the newest `limit` messages (default 50, max 100), oldest of that window first. Pass `before` (ISO-8601) to load the previous page. Soft-deleted messages stay in the list with `deleted: true` and an empty `text`.

## Prerequisites

- Node.js 20+
- Docker, for local MySQL
- A Firestore emulator or a Firebase service account

## Run locally

```bash
docker compose up -d
Copy-Item .env.example .env   # Windows PowerShell
# cp .env.example .env        # macOS / Linux
npm install
npx firebase-tools emulators:start --only firestore
```

Node 20 or newer is required. In a second terminal:

```bash
npm run start:dev
```

API: `http://localhost:3000`  
OpenAPI: `http://localhost:3000/docs`  
Emulator UI: `http://localhost:4000`

The app runs the SQL migration on startup (`DB_MIGRATIONS_RUN=true`). Leave `DB_SYNCHRONIZE=false` so TypeORM does not try to create the same tables.

### Production Firestore

Unset `FIRESTORE_EMULATOR_HOST` and set:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (one line, with `\n` escapes)

The Admin SDK bypasses security rules. `firestore.rules` denies all client access.

## API

### Users

Users have to exist before they can be added to a chat.

`POST /users`

```json
{ "displayName": "Ada", "email": "ada@example.com" }
```

`GET /users/:userId`

### Chats

`POST /chat/create`

```json
{ "userAId": "<uuid>", "userBId": "<uuid>" }
```

Response: `{ "chatId": "<uuid>" }`. Calling it again with the same pair, in either order, returns the existing chat.

`GET /user/:userId/chats`

```json
[
  {
    "chatId": "<uuid>",
    "type": "direct",
    "name": null,
    "memberIds": ["<uuid>", "<uuid>"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

### Messages

`POST /chat/:chatId/message/send`

```json
{ "senderId": "<uuid>", "text": "Hello" }
```

The sender must be a member. `createdAt` is a Firestore timestamp written by the API.

`GET /chat/:chatId/messages?limit=50&before=2026-01-01T00:00:00.000Z`

`POST /chat/:chatId/message/:messageId/read`

```json
{ "userId": "<uuid>" }
```

`POST /chat/:chatId/lastseen`

```json
{ "userId": "<uuid>", "messageId": "<firestore message id>" }
```

`GET /chat/:chatId/lastseen/:userId`

### Group chats

`POST /chat/group`

```json
{
  "creatorId": "<uuid>",
  "name": "Launch crew",
  "memberIds": ["<uuid>"]
}
```

The creator is an admin. A group needs at least two distinct people.

`POST /chat/:chatId/members`

```json
{ "actorId": "<admin uuid>", "memberId": "<uuid>" }
```

`DELETE /chat/:chatId/members/:memberId`

```json
{ "actorId": "<uuid>" }
```

An admin can remove someone else. A member can leave. The last admin cannot be removed.

`PATCH /chat/:chatId`

```json
{ "actorId": "<admin uuid>", "name": "New name" }
```

`GET /chat/:chatId?userId=<uuid>`

### Edit and delete

`PATCH /chat/:chatId/message/:messageId`

```json
{ "senderId": "<uuid>", "text": "Updated" }
```

`POST /chat/:chatId/message/:messageId/delete`

```json
{ "senderId": "<uuid>" }
```

Only the sender can edit or delete. Delete is soft.

## Tests

```bash
npm test
npm run build
```

Unit tests mock MySQL and Firestore, so they do not need Docker or Firebase.

## Example

```bash
curl.exe -s -X POST http://localhost:3000/users -H "Content-Type: application/json" -d "{\"displayName\":\"Ada\",\"email\":\"ada@example.com\"}"
curl.exe -s -X POST http://localhost:3000/users -H "Content-Type: application/json" -d "{\"displayName\":\"Grace\",\"email\":\"grace@example.com\"}"
curl.exe -s -X POST http://localhost:3000/chat/create -H "Content-Type: application/json" -d "{\"userAId\":\"<ada>\",\"userBId\":\"<grace>\"}"
curl.exe -s -X POST http://localhost:3000/chat/<chatId>/message/send -H "Content-Type: application/json" -d "{\"senderId\":\"<ada>\",\"text\":\"Hello\"}"
curl.exe -s "http://localhost:3000/chat/<chatId>/messages?limit=50"
```
