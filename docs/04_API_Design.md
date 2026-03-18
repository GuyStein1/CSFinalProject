# API Design & Integrations

The backend exposes a RESTful API for standard CRUD operations and uses WebSockets (Socket.io) for real-time features.

## 1. Authentication
Authentication is handled client-side by the Firebase JS SDK. The backend does **not** have register/login/logout endpoints. Instead, the client signs up and signs in directly with Firebase, obtains a Firebase ID Token, and sends it to the backend on every request.

**Client-Side (Firebase SDK):**
* `createUserWithEmailAndPassword(email, password)` - Registration.
* `signInWithEmailAndPassword(email, password)` - Login.
* `sendEmailVerification()` - Sends verification email (built-in Firebase feature).
* `signOut()` - Logout (client-side only, clears local session).
* `getIdToken()` - Retrieves a fresh Firebase ID Token to attach to API requests.

**Server-Side Verification:**
* Every protected API request includes the header `Authorization: Bearer <firebaseIdToken>`.
* The backend `authMiddleware` calls `admin.auth().verifyIdToken(token)` to validate it and extract the `uid`.
* The middleware looks up the local User record by `firebase_uid` and attaches it to `req.user`.

**Backend Auth Endpoint:**
* `POST /api/auth/sync` - Called once after Firebase registration to create the local User record in PostgreSQL.
  * Body: `{ full_name, phone_number? }`
  * Requires: Firebase ID Token in header (used to extract `uid` and `email` from the verified token).
  * Response: `{ user }` (the newly created local User record).

## 2. Users
All user endpoints require a valid Firebase ID Token (`Authorization: Bearer <firebaseIdToken>`).
* `GET /api/users/me` - Get current user profile.
* `PUT /api/users/me` - Update profile (bio, avatar, payment_link, phone_number).
* `GET /api/users/:id` - Get public profile (including portfolio, certs, reviews).

## 3. Tasks (Requester & Discovery)
* `POST /api/tasks` - Create a new task (Requires Requester role context).
* `GET /api/tasks` - Discovery feed for Fixers. Accepts query params: `lat`, `lng`, `radius`, `category`, `minPrice`, `maxPrice`. (Powered by PostGIS).
* `GET /api/tasks/:id` - Get task details. (Exact address hidden unless user is the assigned Fixer).
* `PUT /api/tasks/:id/status` - Update task status (e.g., mark as COMPLETED).

## 4. Bidding System
* `POST /api/tasks/:id/bids` - Fixer submits a bid.
* `GET /api/tasks/:id/bids` - Requester views all bids for their task.
* `PUT /api/bids/:id/accept` - Requester accepts a bid. (Changes Task status to IN_PROGRESS, assigns Fixer, reveals exact address, rejects other bids).
* `PUT /api/bids/:id/reject` - Requester manually rejects a bid.

## 5. Reviews & Reputation
* `POST /api/tasks/:id/reviews` - Submit a review after task completion.
* `GET /api/users/:id/reviews` - Get all reviews for a user.

## 6. Portfolios & Certifications
* `POST /api/users/me/portfolio` - Add a portfolio item.
* `DELETE /api/users/me/portfolio/:id` - Remove a portfolio item.
* `POST /api/users/me/certifications` - Upload a certification.

## 7. Real-Time Chat (Socket.io)
* **Namespace/Room:** Each task has a dedicated Socket room `task_chat_{taskId}`.
* **Events:**
  * `join_chat` (Payload: taskId)
  * `send_message` (Payload: taskId, senderId, content)
  * `receive_message` (Payload: Message object)
  * `typing_indicator` (Payload: taskId, userId, isTyping)
* **REST Fallback:**
  * `GET /api/tasks/:id/messages` - Fetch chat history.

## 8. Notifications
* `GET /api/notifications` - Fetch user's notifications.
* `PUT /api/notifications/:id/read` - Mark notification as read.
* **Push Notifications:** Handled server-side via Firebase Admin SDK when specific events occur (e.g., Bid Accepted, New Message).

---

## 9. WebSocket Authentication
Socket.io connections are authenticated during the handshake. The client sends the Firebase ID Token in the `auth` object. The server calls `admin.auth().verifyIdToken(token)` before allowing the connection. If the token expires mid-session, the client retrieves a fresh token via `getIdToken(true)` and reconnects.

## 10. Standard Error Response Format
All API errors follow a consistent JSON structure:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the problem.",
    "details": {}
  }
}
```
Common error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.
