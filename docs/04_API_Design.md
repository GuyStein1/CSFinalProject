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
* `PUT /api/users/me` - Update profile. Accepts any subset of `full_name`, `bio`, `avatar_url`, `payment_link`, `phone_number`, `specializations`, and `language` (`'en' | 'he'`, syncs the UI preference across devices).
* `GET /api/users/:id` - Get public profile (including portfolio, approved certifications, specializations, and a summary of recent reviews). `phone_number` is **not** included — it is only visible in Task Details once a bid is accepted. For the full paginated review list, use `GET /api/users/:id/reviews`.
* `PATCH /api/users/me/email-verified` - Sync the Firebase `emailVerified` flag into the local `User.email_verified` field after the user verifies their email. The endpoint re-verifies the caller's Firebase token before accepting the sync; if the token still reports the address as unverified it returns `403 EMAIL_NOT_VERIFIED`.
* `DELETE /api/users/me` - Permanently delete the account: cancels active tasks as needed, preserves past reviews in anonymized form, and deletes the Firebase Auth account server-side via the Admin SDK.
* `POST /api/users/me/push-token` - Register or update the device's Expo push token. Called on app launch after authentication.
  * Body: `{ token: string }` — stored in `User.push_token`. Silently overwrites any existing token.

### 2.1 Fixer profile — verification & credentials
* `POST /api/users/me/verification` - Submit identity verification. Body: `{ verification_photo_url, verification_selfie_url }` (both required, Firebase Storage URLs). Sets `verification_status = PENDING` for admin review.
* `GET /api/users/me/certifications` - List the authenticated Fixer's own certifications, including `PENDING`/`APPROVED`/`REJECTED` status.
* `POST /api/users/me/certifications` - Upload a credential. Body: `{ category, title, document_url }`. Currently `category` is restricted to `PLUMBING` or `ELECTRICITY`, and the requesting Fixer must already have that category in their `specializations`. Created with status `PENDING`; an admin approves or rejects it.
* `POST /api/users/me/portfolio` - Add a portfolio item (`image_url`, optional `description`).
* `DELETE /api/users/me/portfolio/:id` - Remove a portfolio item.

## 3. Tasks (Requester & Discovery)
* `POST /api/tasks` - Create a new task. Body: `{ title, description, media_urls?, category, suggested_price?, urgency?, general_location_name, exact_address, lat, lng }` (lat/lng are separate top-level fields — not a nested `coordinates` object; the server persists them into the PostGIS `Point` column).
* `GET /api/users/me/tasks` - Get the authenticated Requester's own tasks. Query params: `status` (filter by TaskStatus, e.g., `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELED`), `page`, `limit`. Used to populate the Requester dashboard. Each item is enriched with `bid_count`, `assigned_fixer_id`, `assigned_fixer_name`, `assigned_fixer_avatar`, and `has_review` so the dashboard can render cards without follow-up requests.
* `GET /api/tasks` - Discovery feed for Fixers. Query params:
  * `lat` (required), `lng` (required) - Fixer's current coordinates (or a searched work-area).
  * `radius` - Distance in km. Default: `10`.
  * `category` - Filter by category enum value.
  * `urgency` - Filter by `FLEXIBLE`, `THIS_WEEK`, or `TODAY`.
  * `minPrice`, `maxPrice` - Price range filter. Tasks with `suggested_price = null` ("Quote Required") are **always included** regardless of this filter.
  * `page` (default: `1`), `limit` (default: `20`, max: `50`) - Pagination.
  * Powered by PostGIS `ST_DWithin`. Returns only tasks with status `OPEN`.
* `GET /api/tasks/:id` - Get task details. Access rules:
  * `exact_address` is included **only** if the requesting user is the task's `requester_id` or the `assigned_fixer_id`.
  * Response includes `bid_count` (count of `PENDING` + `ACCEPTED` bids), `lat` / `lng` (broken out from the PostGIS column for map rendering), and `my_review` (the caller's review of this task, when applicable).
  * All other fields are public.
* `GET /api/tasks/:id/directions` - Returns driving directions (via the Google Directions API) from a supplied origin (`originLat`, `originLng`, optional `lang`) to the task's location. Returns `{ directions: null }` if no Maps API key is configured or no route is found.
* `PUT /api/tasks/:id` - Update task content while status is `OPEN`. Editable fields (per `updateTaskSchema`): `title`, `description`, `category`, `suggested_price`, `general_location_name`, `exact_address`. Editing media, urgency, or coordinates is currently not exposed via this endpoint.
* `PUT /api/tasks/:id/status` - Update task status. Supports `OPEN→CANCELED` and `IN_PROGRESS→CANCELED` (Requester). Once `is_payment_confirmed = true` on an `IN_PROGRESS` task, `IN_PROGRESS→CANCELED` is refused (payment must be reversed off-platform). Reaching `COMPLETED` goes through the two-sided completion handshake below, not this endpoint. Reopening a `CANCELED` task uses `/reopen`.
* `PUT /api/tasks/:id/confirm-completion` - Two-sided completion handshake. Requires the task to be `IN_PROGRESS` **with payment already confirmed** (`is_payment_confirmed = true`). Either party confirms their side (`requester_completed` / `fixer_completed`); when **both** have confirmed, the task transitions to `COMPLETED`, `completed_at` is set, the Fixer's completed-task count increments, and the 14-day review window opens.
* `POST /api/tasks/:id/completion-photos` - Attach photos of the finished work (stored in `Task.completion_photos`).
* `PUT /api/tasks/:id/reopen` - Requester re-posts a `CANCELED` task. Valid **only** when status is `CANCELED`. Resets status to `OPEN`, clears `assigned_fixer_id`, and **deletes the previous round of bids and chat messages** (in one transaction) so the task reappears as a clean slate: prior bidders can bid again, no stale `ACCEPTED` bid lingers, `bid_count` starts at 0, and a future fixer can't read the prior chat history. `403` if the caller is not the requester; `400` if the task is not `CANCELED`.
* `PUT /api/tasks/:id/confirm-payment` - Requester confirms payment was sent via Bit/Paybox. Sets `Task.is_payment_confirmed = true` and notifies the Fixer. Valid while the task is `IN_PROGRESS` or `COMPLETED` — in the standard flow the Requester confirms payment **before** the two-sided completion handshake (which requires payment first).
* `DELETE /api/tasks/:id` - Requester permanently deletes their own task. Allowed **only** when the task is `COMPLETED` or `CANCELED`; cascades to its reviews, messages, bids, and related notifications.

## 4. Bidding System
* `POST /api/tasks/:id/bids` - Fixer submits a bid. Enforces unique constraint on `task_id + fixer_id` (one bid per Fixer per task) and a **15-bid cap** per task (returns `409 CONFLICT` when the task already has 15 `PENDING` or `ACCEPTED` bids). Response includes `has_existing_bid: true` if the Fixer already bid, allowing the frontend to show "Bid Submitted ✓" without an extra roundtrip.
* `GET /api/tasks/:id/bids` - Requester views all bids for their task. Each returned bid is enriched with `is_repeat_customer`, `previous_tasks_together` (integer count), and `certified_categories` (array) so the frontend can render trust badges on the bid card without extra lookups.
* `GET /api/users/me/bids` - Fetch the authenticated Fixer's submitted bids. Supports filters for `status`, `page`, and `limit`. Used by the "My Bids" screen.
* `PUT /api/bids/:id` - Fixer edits their own bid (`offered_price`, `description`) while it is still `PENDING`.
* `DELETE /api/bids/:id` - Fixer permanently deletes their own bid.
* `PUT /api/bids/:id/accept` - Requester accepts a bid. Side effects: Task status → `IN_PROGRESS`, `assigned_fixer_id` set, exact address revealed to Fixer, all other `PENDING` bids auto-rejected (each stamped with `auto_rejected_winning_price`/`auto_rejected_winning_rating` for context), Fixer notified via push. Chat is **not** activated here — it is already available between the Requester and any `PENDING`/`ACCEPTED` bidder (see §7).
* `PUT /api/bids/:id/reject` - Requester manually rejects a bid, with an optional `rejection_reason` and `rejection_note`.
* `PUT /api/bids/:id/withdraw` - Fixer withdraws their own `PENDING` bid. Sets status to `WITHDRAWN` and notifies the Requester.
* `PUT /api/bids/:id/reactivate` - Fixer re-activates a `WITHDRAWN` bid back to `PENDING`. Valid only while the bid is `WITHDRAWN` and the task is still `OPEN`.
* `PUT /api/bids/:id/cancel-accepted` - Cancels an already-`ACCEPTED` bid (e.g., the Fixer backs out), returning the task to `OPEN` so the Requester can choose another Fixer.

## 5. Reviews & Reputation
* `POST /api/tasks/:id/reviews` - Requester submits a rating (1–5) and optional comment for the Fixer. Rejected with `FORBIDDEN` if the requesting user is not the task's Requester, if the task status is not `COMPLETED`, if a review already exists for this task, or if more than 14 days have passed since the task was completed.
* `GET /api/users/:id/reviews` - Get all reviews received by a Fixer (as reviewee). Sorted by `created_at` descending.
* `POST /api/reviews/:id/report` - Report a review as inappropriate (`reason` + optional `details`). **Only the review's subject (`reviewee_id`) can report their own review** — other users cannot. Flags the review (`is_flagged = true`) and queues it for admin moderation. One report per user per review.

## 6. Admin & Moderation
All admin endpoints require an authenticated user with `is_admin = true` (enforced by `adminAuth` middleware).
* `GET /api/admin/flagged-reviews` - List reviews that have been reported, for moderation.
* `POST /api/admin/reviews/:id/hide` - Hide an abusive review (`is_hidden = true`).
* `POST /api/admin/reviews/:id/dismiss` - Dismiss the reports on a review, clearing the flag.
* `GET /api/admin/pending-verifications` - List Fixers awaiting identity verification.
* `POST /api/admin/users/:id/verify` - Approve or reject a Fixer's identity verification. Body: `{ action: 'approve' | 'reject' }`. Sets `verification_status` and notifies the user.
* `GET /api/admin/pending-certifications` - List uploaded certifications awaiting review.
* `POST /api/admin/certifications/:id/review` - Approve or reject a certification. Body: `{ action: 'approve' | 'reject', rejection_note? }`. Sets its `CertificationStatus` and notifies the Fixer.
* `GET /api/admin/download-photo` - Securely proxy a verification document/selfie for admin viewing.

## 7. Real-Time Chat (Socket.io)
* **Namespace/Room:** Each task has a dedicated Socket room `task_chat_{taskId}`.
* **Authorization model:** A user is allowed to read/send messages on a task's chat when **any** of the following is true:
  * They are the Requester (`task.requester_id`).
  * They are the assigned Fixer (`task.assigned_fixer_id`).
  * They have a bid on the task whose status is `PENDING` or `ACCEPTED`.

  This means the Requester can chat with any Fixer who has bid on the task even before accepting a bid (the UI only exposes the "Chat with bidder" affordance to the Requester; Fixers wait for acceptance before seeing the initiate-chat affordance, but can reply once the Requester has opened a thread). The same rule is enforced on `send_message`, `GET /api/tasks/:id/messages`, and `PUT /api/tasks/:id/messages/read`.
* **Rooms:** On connection, the server also auto-joins a per-user room `user_{userId}` used for out-of-chat pushes (bell-badge updates, task-status changes).
* **Client → server events:**
  * `join_chat` (Payload: taskId) — joins the task's chat room after re-checking authorization.
  * `send_message` (Payload: `{ taskId, content, recipientId? }`; sender is taken from the authenticated socket, not the payload). `recipientId` is optional and only used for pre-acceptance Requester→bidder messages where `assigned_fixer_id` is not yet set.
  * `mark_read` (Payload: taskId) — marks all messages in the task's chat as read for the authenticated user and emits `messages_read` back into the room.
* **Server → client events:**
  * `receive_message` (Payload: Message object) — broadcast to the `task_chat_{taskId}` room when a new message is persisted.
  * `messages_read` (Payload: `{ taskId, readerId }`) — broadcast when the counterparty opens the chat; drives the ✓✓ read-receipt tick.
  * `task_status_changed` (Payload: `{ taskId, status }`) — emitted from status-changing endpoints (accept, cancel, complete, reopen, cancel-accepted) so any open chat / task-details screen flips into the correct read-only or active state in real time.
  * `notification_update` (delivered on the `user_{userId}` room) — nudges the client to refetch its notification / unread-message counts.
  * `typing_indicator` — **not implemented**; kept here for reference only.
* **REST Fallback:**
  * `GET /api/tasks/:id/messages` - Fetch chat history. Query params: `page` (default: `1`), `limit` (default: `30`, max: `100`). Returns messages sorted oldest-first within each page. Client loads older messages by incrementing `page` on scroll-up.
  * `GET /api/conversations` - Fetch conversation summaries for the authenticated user. Query params: `mode` (`requester | fixer`) filters to conversations where the caller is acting in that role. Each item includes `taskId`, `taskTitle`, `taskStatus`, `userRole`, other party summary, last message preview, last message timestamp, and unread count.
  * `PUT /api/tasks/:id/messages/read` - Mark all messages in a task's chat as read for the authenticated user (drives read receipts and unread counts).
  * `DELETE /api/tasks/:id/messages` - Delete the task's chat history (used when reopening a task / clearing a conversation).

## 8. Notifications
* `GET /api/notifications` - Fetch the user's notifications. Query param `mode` (`requester | fixer`) filters to notifications relevant to that role, matching the current workspace tab.
* `PUT /api/notifications/:id/read` - Mark a notification as read.
* `PUT /api/notifications/read-all` - Mark all notifications as read for the authenticated user. Accepts the same `mode` filter as the list endpoint so the "mark all read" action scopes to the visible role.
* `DELETE /api/notifications/:id` - Delete a single notification.
* `DELETE /api/notifications` - Clear all of the authenticated user's notifications.
* **Push Notifications:** Handled server-side via the notification service when specific events occur (e.g., Bid Accepted, Bid Withdrawn, New Message, Verification/Certification reviewed). Push delivery uses Expo push tokens.

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
