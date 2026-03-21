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
* `PUT /api/users/me` - Update profile (`full_name`, `bio`, `avatar_url`, `payment_link`, `phone_number`, `specializations`).
* `GET /api/users/:id` - Get public profile (including portfolio, certifications, specializations, and a summary of recent reviews). `phone_number` is **not** included — it is only visible in Task Details once a bid is accepted. For the full paginated review list, use `GET /api/users/:id/reviews`.
* `DELETE /api/users/me` - Permanently delete account. Side effects: all OPEN tasks are auto-canceled (bidders notified), IN_PROGRESS tasks are canceled with a warning to the other party, past reviews are preserved (anonymized as "Deleted User"), Firebase Auth account is deleted server-side via Admin SDK.
* `POST /api/users/me/fcm-token` - Register or update the device's FCM push token. Called on every app launch after authentication.
  * Body: `{ token: string }`
  * Stores the token in `User.fcm_token`. Silently overwrites any existing token.

## 3. Tasks (Requester & Discovery)
* `POST /api/tasks` - Create a new task.
* `GET /api/users/me/tasks` - Get the authenticated Requester's own tasks. Query params: `status` (filter by TaskStatus, e.g., `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`), `page`, `limit`. Used to populate the Requester dashboard.
* `GET /api/tasks` - Discovery feed for Fixers. Query params:
  * `lat` (required), `lng` (required) - Fixer's current coordinates.
  * `radius` - Distance in km. Default: `10`. Allowed values: `5`, `10`, `25`, `50`.
  * `category` - Filter by category enum value.
  * `minPrice`, `maxPrice` - Price range filter. Tasks with `suggested_price = null` ("Quote Required") are **always included** regardless of this filter.
  * `page` (default: `1`), `limit` (default: `20`, max: `50`) - Pagination.
  * Powered by PostGIS `ST_DWithin`. Returns only tasks with status `OPEN`.
* `GET /api/tasks/:id` - Get task details. Access rules:
  * `exact_address` is included **only** if the requesting user is the task's `requester_id` or the `assigned_fixer_id`.
  * All other fields are public.
* `PUT /api/tasks/:id` - Update task content. Allowed only by the task's `requester_id` and only while status is `OPEN`. Editable fields: `title`, `description`, `media_urls`, `category`, `suggested_price`, `general_location_name`, `exact_address`, `coordinates`.
* `PUT /api/tasks/:id/status` - Update task status. Valid transitions: `OPEN→CANCELED` (Requester), `IN_PROGRESS→COMPLETED` (Requester), `IN_PROGRESS→CANCELED` (Requester). Setting to `COMPLETED` does **not** set `is_payment_confirmed` — that is a separate action.
* `PUT /api/tasks/:id/confirm-payment` - Requester confirms payment was sent via Bit/Paybox. Sets `Task.is_payment_confirmed = true`. Only valid when task status is `COMPLETED`.

## 4. Bidding System
* `POST /api/tasks/:id/bids` - Fixer submits a bid. Enforces unique constraint on `task_id + fixer_id` (one bid per Fixer per task). Response includes `has_existing_bid: true` if the Fixer already bid, allowing the frontend to show "Bid Submitted ✓" without an extra roundtrip.
* `GET /api/tasks/:id/bids` - Requester views all bids for their task.
* `PUT /api/bids/:id/accept` - Requester accepts a bid. Side effects: Task status → `IN_PROGRESS`, `assigned_fixer_id` set, exact address revealed to Fixer, all other `PENDING` bids auto-rejected, chat channel activated, Fixer notified via FCM.
* `PUT /api/bids/:id/reject` - Requester manually rejects a bid.
* `PUT /api/bids/:id/withdraw` - Fixer withdraws their own bid. Only valid while bid status is `PENDING`. Sets status to `WITHDRAWN` and notifies the Requester.

## 5. Reviews & Reputation
* `POST /api/tasks/:id/reviews` - Requester submits a rating (1–5) and optional comment for the Fixer. Rejected with `FORBIDDEN` if the requesting user is not the task's Requester, if the task status is not `COMPLETED`, if a review already exists for this task, or if more than 14 days have passed since the task was completed.
* `GET /api/users/:id/reviews` - Get all reviews received by a Fixer (as reviewee). Sorted by `created_at` descending.

## 6. Portfolios & Certifications
* `POST /api/users/me/portfolio` - Add a portfolio item.
* `DELETE /api/users/me/portfolio/:id` - Remove a portfolio item.
* `POST /api/users/me/certifications` - Upload a certification.
* `DELETE /api/users/me/certifications/:id` - Remove a certification.

## 7. Real-Time Chat (Socket.io)
* **Namespace/Room:** Each task has a dedicated Socket room `task_chat_{taskId}`.
* **Events:**
  * `join_chat` (Payload: taskId)
  * `send_message` (Payload: taskId, senderId, content)
  * `receive_message` (Payload: Message object)
  * `typing_indicator` (Payload: taskId, userId, isTyping) — *Stretch Goal: not in Phase 1.*
* **REST Fallback:**
  * `GET /api/tasks/:id/messages` - Fetch chat history. Query params: `page` (default: `1`), `limit` (default: `30`, max: `100`). Returns messages sorted oldest-first within each page. Client loads older messages by incrementing `page` on scroll-up.

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
