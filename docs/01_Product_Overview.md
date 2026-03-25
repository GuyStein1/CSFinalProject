# Fixlt: Product Overview

## 1. Executive Summary

### The Problem
Finding reliable help for small, everyday tasks — assembling furniture, mounting TVs, fixing a leaking pipe, painting a room — is a high-friction process in Israel. Traditional contractors won't take micro-gigs, and prices are rarely transparent upfront. The common alternative is posting in WhatsApp groups or Facebook communities, which is unstructured, inconsistent, and leaves both sides with no accountability or protection.

### The Solution: Fixlt
Fixlt is a task marketplace connecting two types of users:
1. **Requesters** — people who need a small job done and want to receive competitive offers from local professionals.
2. **Fixers** — handy individuals, whether certified professionals or skilled locals, who want to earn money doing what they're good at.

The platform's core value proposition is a transparent bidding system: Requesters describe their job and set a budget (or ask for quotes), and Fixers in the area compete for the work by submitting offers. This creates a competitive, price-transparent market that benefits both sides.

### Platform Scope
Fixlt is built as **both a mobile app and a web app**, with feature parity between them. This is a deliberate goal of the project — to demonstrate full-stack development across two platforms using a shared backend.

- **Mobile** (iOS & Android): React Native via Expo. The primary experience, especially for Fixers who need GPS, camera, and on-the-go access.
- **Web**: React.js (or Expo Web). The same features available in a browser. Particularly natural for Requesters who may prefer posting tasks from a desktop.

---

## 2. User Roles

Both roles live in a **single unified account**. Any user can switch between Requester mode and Fixer mode from the top navigation bar — no second account needed. This is a deliberate design choice: many users will post tasks occasionally while also taking on jobs when they have availability.

---

## 3. Feature Breakdown

Each feature is labeled with its planned status:
- `Phase 1` — core to the project, built from the start
- `Planned` — intended to be added as development progresses
- `Stretch Goal` — added if time and scope allow

---

### 3.1 Authentication & Onboarding

**`Phase 1`**

Users register with their full name, email, and password. Phone number is optional at registration and can be added later — it's displayed to the other party once a task is in progress, for direct coordination.

Firebase Authentication handles the full auth lifecycle: registration, login, session persistence, password reset, and email verification. The backend never stores passwords.

- **Email verification:** After registration, Firebase sends a verification email automatically. Until verified, the user's profile shows no badge. Once verified, an "Email Verified ✓" badge appears on their public profile. The app is fully usable before verification.
- **Password reset:** Standard Firebase email-based reset flow. No custom implementation needed.
- **Session persistence:** Firebase SDK persists the session on the device. Users stay logged in across app restarts; the token is silently refreshed in the background.
- **Language selection:** Available in Settings once Hebrew support is added (see 3.10). In Phase 1, the app runs in English only with no language prompt on first launch.

---

### 3.2 Task Creation

**`Phase 1`**

The Requester's primary action — posting a job. Task creation is a guided multi-step wizard to make it easy and structured:

1. **Title & Description** — A short title (max 80 characters) and a detailed description (max 500 characters) of what needs to be done.
2. **Photos** — Up to 5 photos uploaded from the camera or gallery. Photos give Fixers a visual understanding of the job before bidding, which leads to more accurate quotes.
3. **Category** — Single-select from six options: Electricity, Plumbing, Carpentry, Painting, Moving, General. Used to filter tasks in the Fixer discovery feed.
4. **Budget** — Two options:
   - *Fixed Price:* Requester sets a specific amount (₪). Fixers know exactly what's on offer.
   - *Quote Required:* No amount set. Fixers name their own price in their bid. Used when the Requester doesn't know the market rate or wants competitive quotes.
5. **Location** — Two location fields:
   - *General area (public):* The Requester drops a pin on a map at neighborhood level. This is shown on the discovery feed so Fixers can filter by distance without seeing the exact home.
   - *Exact address (private):* A separate text field. This address is stored securely and only revealed to the Fixer whose bid is accepted.

Before publishing, the Requester sees a summary screen to review all details and jump back to edit any step.

**Task editing:** `Stretch Goal` — After publishing, a Requester may want to correct a typo or update the budget. Editing is only allowed while the task is still `OPEN` (no bid accepted yet). If this proves complex to implement cleanly, it can be deferred — Requesters can cancel and repost instead.

---

### 3.3 Task Discovery (Fixer Feed)

**`Phase 1`**

The primary screen in Fixer mode. Fixers see all open tasks near them and decide which ones to bid on.

- **Map View (default):** A full-screen Google Map with color-coded pins representing open tasks, grouped by category. Tapping a pin shows a preview card with the task title, category, budget, and distance. Tapping the card opens the full task details.
- **List View:** A vertical scrollable list of task cards, each showing the title, category, budget (or "Quote Required"), general location name, distance, time posted, and current bid count. Sorted by distance (nearest first).
- **Filters:** A horizontal chip bar above both views lets Fixers filter by:
  - Distance radius: 5 / 10 / 25 / 50 km
  - Category: one or more
  - Price range: preset brackets or custom input

**Max bids per task:** `Phase 1` — Each task accepts a maximum of **15 bids**. Once reached, the "Submit Bid" button is replaced with "This task is no longer accepting bids." This prevents notification overload for the Requester and creates a sense of urgency for Fixers to bid early.

**"Quote Required" tasks and price filter:** Tasks with no set price ("Quote Required") are always shown in the discovery feed regardless of any active price filter. Since there is no price to compare against, they are treated as potentially fitting any range. Fixers can then decide for themselves whether to bid once they see the task details.

**Task reopen:** `Planned` — If a task is canceled after a bid was accepted (e.g., the Fixer didn't show up), the Requester can reopen it rather than creating a brand-new task from scratch. Reopening resets the task to `OPEN`, clears the assigned Fixer, and puts it back on the discovery feed. All previously rejected bids stay rejected.

---

### 3.4 Bidding System

**`Phase 1`**

The core transaction mechanic of the platform. A Fixer submits a bid containing two things: a **price offer** (₪) and a **pitch message** (why they're the right person for the job). The Requester then reviews all bids and picks one.

Key rules:
- A Fixer can submit **only one bid per task**. They cannot re-bid after withdrawing. `Stretch Goal` — A Fixer may edit the price or pitch of their own bid while it is still `PENDING` (before the Requester acts on it). This avoids the need to withdraw and resubmit while keeping the one-bid-per-task constraint intact.
- The Requester can accept or reject individual bids. **Accepting one bid auto-rejects all other pending bids**, and those Fixers are notified.
- When a bid is accepted: the task moves to `IN_PROGRESS`, the exact address is revealed to the winning Fixer, and the in-app chat between the two parties is activated.
- A Fixer can **withdraw** their own bid at any time while it's still pending (before the Requester acts on it).

The Requester can view each Fixer's full profile before accepting — including their bio, portfolio, specializations, rating, and past reviews. This is how trust is built before committing.

---

### 3.5 Fixer Profile & Trust

**`Phase 1`** (base profile) | **`Stretch Goal`** (certifications)

A Fixer's public profile is their storefront on the platform. It's the primary tool a Requester uses to decide whether to trust and hire them.

- **Basic profile** `Phase 1` — Full name, avatar photo, bio text, overall star rating, and number of completed jobs. The bio is where a Fixer explains their skills, experience, and what kinds of jobs they take.
- **Specializations** `Phase 1` — A multi-select field indicating which categories the Fixer works in (e.g., "Electricity, Plumbing"). Simple to implement, makes profiles immediately informative at a glance, and enables future smart recommendation features.
- **Payment link** `Phase 1` — The Fixer's personal Bit or Paybox URL. This is how they receive payment. Adding a payment link is optional — if missing, a soft warning is shown on their profile ("You haven't added a payment link — Requesters may not be able to pay you easily") and the Requester sees a fallback message at payment time. There is no hard block on bidding without one.
- **Portfolio** `Phase 1` — A photo gallery of past work. Fixers upload images with optional captions (e.g., "Bathroom retiling — Haifa, 2024"). This is a key trust signal: a before/after photo of a well-done job is more convincing than any text description.
- **Certifications** `Stretch Goal` — Fixers can upload documents such as licensed electrician certificates, professional licenses, or insurance papers. These are displayed as-is with no platform verification ("Self-reported credentials") — the portfolio already provides meaningful trust signals and certifications are a nice addition if time allows.

> **Note on certifications:** There is no admin verification workflow in this project. Certifications are simply shown as uploaded documents on the profile — no status badge (Pending/Verified/Rejected).

---

### 3.6 Real-Time Chat

**`Phase 1`**

After a bid is accepted, a private chat channel opens between the Requester and the assigned Fixer. Chat is scoped to the task — each task has its own conversation thread.

Chat is the primary coordination tool: agreeing on timing, sharing additional photos, confirming arrival, etc. It is **not** available before a bid is accepted (to prevent speculative conversations with many Fixers) and becomes **read-only** after a task is completed (preserved as a record).

- Messages are delivered in real time via WebSocket (Socket.io) when both parties are online.
- If the recipient is offline, a push notification is sent instead.
- Full message history is loaded from the database when opening a chat for the first time.

**Read receipts:** `Planned` — (✓ sent, ✓✓ read) shown on each message bubble. Requires tracking read state per message and emitting real-time events back to the sender. Not in Phase 1.

**Typing indicator:** `Stretch Goal` — Shows "Fixer is typing..." in the chat header. Adds real-time polish but is not essential for the core experience.

---

### 3.7 Push Notifications & Notification Center

**`Phase 1`**

Users receive push notifications for all key events, even when the app is in the background. Tapping a notification deep-links directly to the relevant screen.

| Event | Recipient |
|---|---|
| New bid submitted on your task | Requester |
| Your bid was accepted | Fixer |
| Your bid was rejected or task canceled | Fixer |
| New chat message (recipient offline) | Other party |
| Task marked as completed | Fixer |

In addition to push notifications, a **Notification Center** (bell icon in the top bar) lists all notifications chronologically. Unread items are highlighted; tapping them marks as read and navigates to the relevant entity.

---

### 3.8 Task Completion & Payment

**`Phase 1`**

When the physical work is done, the Requester taps "Mark as Completed" on the task. This moves the task to `COMPLETED` status, unlocks the payment button, and opens the 14-day review window.

**Payment:** Fixlt does not process payments directly. Instead, the Requester taps "Pay Fixer," which deep-links to the Fixer's Bit or Paybox app with the agreed amount pre-filled. Payment happens externally — no payment infrastructure, no fees, no liability on the platform.

- If the Fixer has not set a payment link, a fallback message is shown with their phone number so the parties can arrange payment directly.

> In-app payment processing (credit card, Apple Pay) is listed as a future idea but is out of scope for this project.

---

### 3.9 Review System

**`Phase 1`**

After a task is completed, the Requester can rate the Fixer on a 1–5 star scale with an optional written comment. This rating contributes to the Fixer's overall average displayed on their profile and on bid cards.

Key rules:
- Reviews are **one-way**: only the Requester rates the Fixer. Fixers do not rate Requesters. This keeps the system focused on helping future Requesters make informed hiring decisions.
- The review window is **14 days** from task completion. After this, the prompt disappears and no review can be submitted.
- One review per task. Reviews are permanent and cannot be edited.
- Reviews are visible immediately upon submission.

---

### 3.10 Bilingual Support (English & Hebrew)

**`Phase 1`** (English) | **`Planned`** (Hebrew)

The platform targets the Israeli market and will support both English and Hebrew. Development is done in English first — all UI strings, labels, error messages, and notifications are written in English as the baseline. Hebrew is then added as a translation layer using an i18n library.

When Hebrew is active:
- Full RTL (right-to-left) layout switch.
- All strings replaced with Hebrew translations.
- Currency displayed in ₪ (Israeli Shekel) in both languages.

The language toggle is available on the Welcome screen (before login) and in Settings (after login).

- **Phase 1 (local storage):** The selected language is saved in device-local storage (AsyncStorage on mobile, localStorage on web). Simple to implement, no backend required.
- **`Planned` (DB persistence):** When Hebrew is added in Phase 5, the preference will be stored as a `language` field (`'en' | 'he'`) on the `User` record. This ensures the language choice syncs across devices. Requires adding the field to the Prisma schema and updating it via `PUT /api/users/me`.

---

### 3.11 Account Management

**`Phase 1`** (settings, logout) | **`Stretch Goal`** (account deletion)

**Settings screen** provides:
- View/edit phone number
- Change password (triggers Firebase password reset email)
- Language toggle (EN/HE)
- Push notification on/off toggle
- Log out

**Account deletion** `Stretch Goal` — Permanently deletes the user's account. OPEN tasks are auto-canceled, IN_PROGRESS tasks are canceled with a warning to the other party, past reviews are anonymized as "Deleted User." The Firebase Auth account is also deleted server-side. Important to have but can be added later in the project.

---

## 4. Additional Features

Features that are part of the broader product vision. Whether and when to implement them will be decided throughout the project based on progress and remaining time:

- **In-App Payments** — Full payment processing (credit card, Apple Pay, Google Pay) removing the dependency on external Bit/Paybox apps.
- **Admin Dashboard** — Web interface for moderation: reviewing reported content, handling disputes, and officially verifying Fixer certifications.
- **AI Smart Categorization** — Image recognition (OpenAI Vision or Google Gemini) to automatically suggest a task category based on uploaded photos.
- **Live Fixer Tracking** — "Fixer is on the way" GPS tracking, similar to Wolt or Uber, once a bid is accepted and the Fixer is en route.
- **Smart Recommendations & Direct Invites** — Algorithmically surface relevant tasks to Fixers based on their specializations and location. Allow Requesters to directly invite a specific top-rated Fixer to bid on their task.
- **Certification Verification** — Admin-reviewed approval of uploaded Fixer credentials, with a "Verified" badge displayed on the profile.
- **Dispute Resolution** — Structured process for when a task goes wrong: flagging, evidence submission, admin mediation.
- **Keyword Search** — Search tasks by keyword in the discovery feed (e.g., "IKEA assembly", "washing machine"). Currently discovery is purely location + category + price. Keyword search would complement the existing filters.
- **Smart Sort & Recommendations** — Sort the discovery feed by factors beyond distance (recency, match to Fixer specializations, task urgency). Allow the platform to surface relevant tasks to specific Fixers proactively.

> **Note on reporting:** There is no in-app report or flag mechanism in this project. Any content moderation would be handled directly at the database level.
