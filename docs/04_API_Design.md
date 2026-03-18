# API Design & Integrations

The backend exposes a RESTful API for standard CRUD operations and uses WebSockets (Socket.io) for real-time features.

## 1. Authentication & Users
* `POST /api/auth/register` - Register a new user (Phone/Email verification).
* `POST /api/auth/login` - Authenticate and return JWT.
* `GET /api/users/me` - Get current user profile.
* `PUT /api/users/me` - Update profile (bio, avatar, payment_link).
* `GET /api/users/:id` - Get public profile (including portfolio, certs, reviews).

## 2. Tasks (Requester & Discovery)
* `POST /api/tasks` - Create a new task (Requires Requester role context).
* `GET /api/tasks` - Discovery feed for Fixers. Accepts query params: `lat`, `lng`, `radius`, `category`, `minPrice`, `maxPrice`. (Powered by PostGIS).
* `GET /api/tasks/:id` - Get task details. (Exact address hidden unless user is the assigned Fixer).
* `PUT /api/tasks/:id/status` - Update task status (e.g., mark as COMPLETED).

## 3. Bidding System
* `POST /api/tasks/:id/bids` - Fixer submits a bid.
* `GET /api/tasks/:id/bids` - Requester views all bids for their task.
* `PUT /api/bids/:id/accept` - Requester accepts a bid. (Changes Task status to IN_PROGRESS, assigns Fixer, reveals exact address, rejects other bids).
* `PUT /api/bids/:id/reject` - Requester manually rejects a bid.

## 4. Reviews & Reputation
* `POST /api/tasks/:id/reviews` - Submit a review after task completion.
* `GET /api/users/:id/reviews` - Get all reviews for a user.

## 5. Portfolios & Certifications
* `POST /api/users/me/portfolio` - Add a portfolio item.
* `DELETE /api/users/me/portfolio/:id` - Remove a portfolio item.
* `POST /api/users/me/certifications` - Upload a certification.

## 6. Real-Time Chat (Socket.io)
* **Namespace/Room:** Each task has a dedicated Socket room `task_chat_{taskId}`.
* **Events:**
  * `join_chat` (Payload: taskId)
  * `send_message` (Payload: taskId, senderId, content)
  * `receive_message` (Payload: Message object)
  * `typing_indicator` (Payload: taskId, userId, isTyping)
* **REST Fallback:**
  * `GET /api/tasks/:id/messages` - Fetch chat history.

## 7. Notifications
* `GET /api/notifications` - Fetch user's notifications.
* `PUT /api/notifications/:id/read` - Mark notification as read.
* **Push Notifications:** Handled server-side via Firebase Admin SDK when specific events occur (e.g., Bid Accepted, New Message).
