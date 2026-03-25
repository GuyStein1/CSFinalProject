# System Architecture

## 1. Technical Architecture & Stack
Fixlt utilizes an API-first architecture, strictly separating the frontend client from the backend engine to seamlessly power both web and mobile experiences. The project uses a Full-Stack TypeScript paradigm.

### Frontend (Cross-Platform)
* **Mobile App:** React Native with Expo (TypeScript).
* **Web Platform:** React.js (or Expo Web) for responsive browsers.
* **Benefit:** Maximizes code reuse across iOS, Android, and Web.

### Backend
* **Framework:** Node.js with Express (TypeScript) acting as a RESTful API service.
* **Benefit:** Asynchronous, event-driven engine perfect for real-time chat and fast JSON processing.

### Database
* **Primary DB:** PostgreSQL. Handles complex relational data (users, tasks, bids, reviews).
* **Spatial Extension:** PostGIS. Handles geographical math directly at the database level for lightning-fast "find jobs within 5km" queries.
* **ORM:** Prisma. Provides strict type safety bridging PostgreSQL to the Node.js backend.

### Authentication
* **Provider:** Firebase Authentication (free tier — 50,000 MAU). Handles registration, login, session management, email verification, and token lifecycle.
* **Client-Side:** Firebase JS SDK (`firebase/auth`) handles sign-up, sign-in, and ID token retrieval. The SDK automatically refreshes expired tokens.
* **Server-Side:** `firebase-admin` SDK verifies Firebase ID Tokens on every protected request. No password hashing, refresh token tables, or custom JWT logic needed on the backend.
* **Middleware:** All protected routes pass through an `authMiddleware` that calls `admin.auth().verifyIdToken(token)` using the token from the `Authorization: Bearer <token>` header. Extracts `uid` and attaches it to `req.user`.

### External APIs & Services
* **Location Services:** Google Maps API (map rendering, geocoding, distance calculations).
* **Real-time/Notifications:** Firebase Cloud Messaging (FCM) for push notifications, WebSockets (Socket.io) for real-time chat.
* **Cloud Storage:** Firebase Storage for images (task photos, portfolios, certifications). Upload strategy: the client uploads the file **directly to Firebase Storage** (using the Firebase Client SDK) and receives a public download URL. The client then sends only the URL to the backend to store in PostgreSQL. This keeps large binary data off the Node.js server.


---

## 2. System Architecture Flow
1. **Client Tier:** Expo/React application captures user input and hardware data (Camera, GPS).
2. **API Tier:** Node.js RESTful endpoints handle business logic, bid management, and location filtering.
3. **Data Tier:** PostgreSQL stores relational entities. Cloud storage holds media files.

---

## 3. Project Scope & Constraints
* **Payments:** No in-app payment processing. Fixers link personal Bit or Paybox URLs. The app generates a "Pay Fixer" deep-link button upon task completion. The Requester can optionally confirm payment was sent via a "Confirm Payment" tap, tracked by `Task.is_payment_confirmed`.
* **Trust & Liability:** Relies on the one-way rating system (Requesters rate Fixers). Certifications are user-uploaded for display only — no platform verification. Terms of Service waives platform liability.
* **Email Verification:** Handled by Firebase Auth's built-in `sendEmailVerification()`. No custom SMTP setup needed. Phone number is collected for contact but not verified.
* **Deployment:** Mobile app demonstrated via Expo Go (bypassing App Store/Google Play). Web app hosted locally or via Vercel.
* **Cold Start Demo:** Database seeded with mock tasks/users in a specific area (e.g., Haifa/Be'er Sheva) to demonstrate filtering and maps.

---
## 4. Architectural Patterns & Guidelines

### 4.1. Design Pattern: Modular Monolith
To balance development speed with future scalability, the backend will be structured as a **Modular Monolith**. The application will be deployed as a single unit, but internal code will be strictly divided
into feature-based modules (e.g., Users, Tasks, Bidding). This avoids the operational overhead of microservices while keeping the codebase clean and ready for extraction if heavy scaling is required later.

### 4.2. 3-Layer Architecture
The backend code enforces strict separation of concerns using a 3-layer architecture:
*   **Controller Layer:** Manages HTTP requests, responses, and status codes. Does not contain business logic.
*   **Service (Domain) Layer:** Contains the core business rules and logic. Completely decoupled from HTTP and database specifics.
*   **Repository Layer:** Manages data persistence. Prisma Client serves as the primary data access layer, abstracted where necessary to ensure the Service layer remains highly testable.

### 4.3. Dependency Injection
To ensure high testability and decoupling, **Dependency Injection (DI)** principles will be applied. Services and Repositories will receive their dependencies via constructors. This allows for easy mocking
    of database connections and external services during unit testing.

### 4.4. Request Validation
All incoming HTTP requests (Body, Query, Params) will be validated at the route level using **Zod** middleware. This ensures strict type-safety and guarantees that malformed or malicious data is rejected
    before it reaches the Controller layer.

### 4.5. Testing Strategy
*   **Target Coverage:** The project aims for an overall **80%** test coverage metric.
*   **Unit Tests:** Focus heavily on the Service Layer (aiming for near 100% coverage) to validate core business logic (e.g., Jest/Vitest).
*   **Integration Tests:** Focus on Controllers and Database interactions, verifying that the system components communicate correctly.
