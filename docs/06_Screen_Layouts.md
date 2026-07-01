# Screen Layouts & UI Plan

## 0. Design System

### UI Component Library: React Native Paper
The project uses **React Native Paper** (Material Design 3) as its UI component library. All screens are built using Paper components (Cards, FABs, SegmentedButtons, Chips, Bottom Sheets, etc.) styled with a global theme. This provides consistent spacing, accessibility, animations, and — critically — built-in RTL layout support for Hebrew.

### Color Theme
| Role | Color | Usage |
|---|---|---|
| Primary | Deep Navy Blue (`#1A237E`) | Buttons, active states, top bar |
| Secondary | Golden Yellow (`#FFC107`) | Accents, highlights, FAB |
| Surface | Light Gray (`#F5F5F5`) | Card backgrounds |
| On Primary | White | Text/icons on navy backgrounds |
| On Secondary | Dark Gray | Text/icons on yellow backgrounds |

Configure once in a `theme.ts` file using `MD3LightTheme` from React Native Paper. All components inherit from it automatically.

### Figma
If a visual reference is needed before coding, duplicate a free **Material Design 3 UI Kit** from Figma Community and sketch 2–3 key screens (Dashboard, Task Creation Wizard, Discovery Feed) only. Full Figma mockups are not required — the screen layouts in this document serve as the primary visual spec.

---

## 1. Authentication Screens

### 1.1 Welcome / Landing Screen
* **Logo:** FixIt branding and tagline centered on screen.
* **Language Toggle:** EN / HE globe icon in the top navigation bar. RTL layout flip is instant.
* **Actions:** Two prominent buttons — "Sign In" and "Create Account", plus a "Continue with Google" button (uses `expo-auth-session` with a platform-appropriate OAuth client ID).
* **Web landing page:** on the web target this screen is replaced by a marketing-style landing page (`LandingScreen.web.tsx`) with hero, services carousel, "how it works", categories, and a large sign-in CTA. Signed-in users are routed straight into the workspace.
* **Background:** Subtle illustration or gradient conveying handyman/services theme.

### 1.2 Registration Screen
* **Inputs:** Full Name, Email, Password, Confirm Password (stacked vertically).
* **Optional Input:** Phone Number (labeled "Optional — for contact purposes").
* **Validation:** Inline error messages beneath each field in real-time (e.g., "Passwords do not match", "Email already in use").
* **Actions:** "Create Account" button (email/password path) + "Continue with Google" (skips the email-verification gate since Google addresses are already verified).
* **Post-registration:** email/password users are routed to the blocking **Email Verify Screen** (§1.5) — they cannot enter the workspace until they verify.
* **Footer Link:** "Already have an account? Log In".

### 1.3 Login Screen
* **Inputs:** Email, Password.
* **Validation:** Inline error beneath password field for invalid credentials.
* **Action:** "Log In" button.
* **Secondary Link:** "Forgot Password?" below the password field.
* **Footer Link:** "Don't have an account? Sign Up".

### 1.4 Password Reset Screen
* **Header:** "Reset your password"
* **Input:** Email address.
* **Action:** "Send Reset Link" button.
* **Success State:** Input and button replaced with a confirmation message: "Check your inbox for a reset link." and a "Back to Login" link.

### 1.5 Email Verify Screen (Blocking Gate)
* Full-screen gate shown after email/password registration. Users cannot enter the workspace until they verify.
* **Content:** headline ("Verify your email"), the address the verification was sent to, and a helper note ("check your spam / junk folder").
* **Actions:**
  * **Resend email** — calls Firebase `sendEmailVerification()` again with a short cooldown.
  * **Change email** — signs out and returns to registration so the user can re-enter a correct address.
  * **Refresh status** — reloads the Firebase user; on success (`emailVerified === true`) calls `PATCH /api/users/me/email-verified` and routes to the dashboard.
  * **Log out** — signs out.
* **Bypass:** Google sign-in bypasses this screen (Google addresses are pre-verified).

---

## 2. Global UI Elements

### 2.1 Top Navigation Bar
* **Left:** App logo / name ("FixIt") — tappable to jump to the mode's home screen.
* **Center (desktop web) / Right:** Workspace navigation. On desktop web, tabs for the mode's screens (Dashboard / My Tasks / Messages / Profile in Requester mode; Find Jobs / My Bids / Messages / Fixer Profile in Fixer mode).
* **Right side:**
  * **Workspace switcher CTA** — a button ("Open Fixer Workspace" / "Open Requester Workspace") that switches modes. Users who have never activated the Fixer role see "Become a Fixer" instead, which routes them through the Become-a-Fixer onboarding.
  * **Notification bell** with unread-count badge, filtered by the current role.
  * **Globe icon (language toggle)** — one-tap EN ↔ HE with instant RTL flip.
  * **Hamburger menu** (mobile-only) — surfaces overflow actions (Settings, mode switch, language, log out).

### 2.2 Bottom Tab Navigation (Mobile)
Tabs change based on the active mode. There is no "Create Task" tab in Requester mode — creation is opened from the dashboard hero button, the services grid, or via the top nav.

**Requester Mode:**
| Tab | Icon | Screen |
|---|---|---|
| Home | House | Requester Dashboard |
| My Tasks | Clipboard | My Tasks Screen |
| Messages | Chat Bubble | Conversation List |
| Profile | Person | Settings (also entry to public profile) |

**Fixer Mode:**
| Tab | Icon | Screen |
|---|---|---|
| Find Jobs | Map + Search | Discovery Feed |
| My Bids | List | Bid Tracker |
| Messages | Chat Bubble | Conversation List |
| Fixer Profile | Person | Fixer Profile Management (dedicated screen — not the Settings screen) |

> **Navigation rule:** the workspace switcher CTA lives in the top nav bar and is available on every screen, so mode switching does not require returning to a root tab. Bottom-tab safe-area insets are honored on Android to avoid overlap with the system gesture / navigation bar.

### 2.3 Web Navigation
On desktop web (`≥ 900 px`) the bottom tabs are replaced by a horizontal tab strip in the top nav bar carrying the same items. The workspace switcher CTA, notification bell, and language toggle sit alongside them.

---

## 3. Requester Mode Screens

### 3.1 Requester Dashboard
The dashboard is a marketing-style landing panel, not a task list — task management lives on the My Tasks screen (see §3.1a). It surfaces:

* **Time-of-day greeting** with the user's name.
* **Hero card:** large "Post a Task" call-to-action.
* **Latest-task quick access:** a compact circular card linking to the user's most recent active task (if any), showing status and title. Tap to jump straight into Task Details.
* **Services grid:** the 9 categories rendered as tappable cards with icon + label. Tapping a card opens the Task Creation wizard pre-selected on that category (Step 3).
* **How it works section:** short 3-step explainer (Post → Get bids → Get it done).
* **Onboarding nudge (dismissible):** if the profile is incomplete (missing avatar / bio / phone), a card prompts the user to complete it — dismissible, non-blocking.

### 3.1a My Tasks Screen
Reached via the "My Tasks" bottom tab (Requester mode). This is where the Requester manages their portfolio of tasks.

* **Workspace header:** stat pills for **Open**, **In Progress**, **Pending Bids** (tasks with `bid_count > 0`), and **To Review** (completed tasks awaiting a review). Tapping a pill filters the list below; tapping the active pill clears the filter.
* **Task list:** vertical scrollable cards. Each card shows title, category, budget, status badge, bid count (for OPEN), assigned Fixer chip (for IN_PROGRESS), and a "Complete & Pay" / "Leave Review" CTA where appropriate.
* **Empty state:** "You haven't posted any tasks yet."
* **Tapping a card** opens the appropriate Task Details view based on status (§3.3 / §3.4 / §3.5).

### 3.2 Task Creation Wizard (Multi-Step)

**Step 1 — Title & Description:**
* **Input:** Title (single line, max 80 chars).
* **Input:** Description (multi-line text area, max 500 chars). Placeholder: "Describe what you need done..."
* **Progress Bar:** Step 1 of 5 indicator at the top.
* **Navigation:** "Next" button at the bottom.

**Step 2 — Photos:**
* **Grid:** 2x3 thumbnail grid. First slot shows a "+" icon to add a photo.
* **Source:** Tap "+" to choose from Camera or Gallery.
* **Limit:** Up to 5 photos. Each thumbnail has an "X" to remove.
* **Navigation:** "Back" and "Next" buttons.

**Step 3 — Category:**
* **Grid:** Visual grid of category cards with `MaterialCommunityIcons` icons and labels:
  * Assembly · Mounting · Moving · Painting · Plumbing · Electricity · Outdoors · Cleaning · Other
* **Selection:** Single-select. Selected card is visually highlighted.
* **Navigation:** "Back" and "Next" buttons.

**Step 4 — Budget & Urgency:**
* **Budget toggle:** "Fixed Price" (numeric input with ₪) or "Quote Required" (Fixers propose their own price).
* **Urgency selector:** three options — `FLEXIBLE`, `THIS_WEEK`, `TODAY`. Shown on the discovery feed and used as a filter.
* **Navigation:** "Back" and "Next" buttons.

**Location Permission (triggered on entering Step 5):**
Before displaying the map, the app checks whether location permission has been granted.
- If **not yet asked**: Show a rationale modal — "FixIt needs your location to drop a pin for your task's general area. Your exact home address is entered separately and stays private." — with "Allow" and "Skip for now" buttons. "Allow" triggers the native iOS/Android permission dialog.
- If **denied**: The map is replaced with a text input labeled "General Area (e.g., 'Hadar, Haifa')" and a note: "Location access was denied. You can enable it in your device Settings, or type your neighborhood manually."
- If **granted**: Map loads normally.

**Step 5 — Location:**
* **General area:** Address text input with Google Places autocomplete. Selecting a suggestion auto-drops a pin on the map at that location; drag or tap the map to fine-tune. Reverse-geocoded neighborhood name is shown below the map.
* **Exact Address Input:** Text field below the map labeled "Exact address (private — shared only with accepted Fixer)."
* **Navigation:** "Back" and "Publish Task" button (primary action, green).

**Review Modal (before publish):**
* Summary card showing: Title, Category, Budget, General Location, Photo count.
* "Edit" link next to each section to jump back.
* "Publish" confirmation button.

### 3.3 Task Details — Status: OPEN (Bid Management)
* **Header:** Task title, status badge ("Open" — green), category icon.
* **Photo Carousel:** Horizontal swipeable gallery of task photos.
* **Details Section:** Description, budget, general location on a small map.
* **Bids Section:**
  * Header: "Received Bids".
  * List of Bid Cards, each showing:
    * Fixer avatar, full name, verification badge (if approved), rating (e.g., "4.8 ★ (23 reviews)"), certified-category badge (if the fixer has an approved certification matching this task's category), and "worked together" chip (repeat-customer signal).
    * Offered price (prominently displayed).
    * First line of their pitch message.
    * Buttons: **Accept** (primary), **Decline** (outline with structured reason picker), and **Chat with bidder** (opens a pre-acceptance chat with that Fixer — Requester-only, see User Flows §5.2).
  * Tapping the avatar / name area opens the Fixer's Public Profile.
* **Empty State (no bids yet):** "No bids yet. Sit tight — Fixers in your area will see your task!"
* **Full State (15 bids reached):** A banner: "This task is no longer accepting new bids." Existing bids can still be managed.
* **Actions:** "Edit Task" (opens the wizard pre-filled) and "Cancel Task" in an overflow menu.

### 3.4 Task Details — Status: IN_PROGRESS
Completion here follows the payment-first, two-sided handshake from User Flows §3.5.

* **Header:** Task title, status badge ("In Progress" — blue).
* **Assigned Fixer Card:** Avatar, name, rating, phone number (tap to call). "View Profile" link.
* **Photo Carousel:** Task photos.
* **Details Section:** Description, budget, exact address (visible to both parties now).
* **Chat Button:** Prominent button or tab: "Chat with [Fixer Name]" with unread message badge.
* **Payment & Completion CTA (stateful):**
  * Before payment: **"Pay Fixer"** (deep-links to Bit / Paybox) OR **"Paid in Cash"**.
  * After paying externally: **"Confirm Payment"** — sets `is_payment_confirmed = true`.
  * After payment is confirmed: **"Mark as Completed"** — sets `requester_completed = true`. If the Fixer has already confirmed on their side, the task flips to `COMPLETED`; otherwise the task stays `IN_PROGRESS` with a "Waiting for the Fixer to confirm" note.
* **Actions:**
  * "Cancel Task" in overflow menu (blocked once payment is confirmed).

### 3.5 Task Details — Status: COMPLETED (and CANCELED)
* **Header:** Task title, status badge ("Completed" — green check / "Canceled" — gray).
* **Summary:** Final price, Fixer name, completion (or cancellation) date.
* **Payment Section (COMPLETED only):**
  * If `is_payment_confirmed = false` and Fixer **has** a `payment_link`: "Pay Fixer" (Bit / Paybox) + "Paid in Cash" alternative + "Confirm Payment".
  * If `is_payment_confirmed = false` and Fixer **has no** `payment_link`: message — "This Fixer hasn't set up a payment link. Contact them directly." + Fixer's phone number as a tappable link (if available).
  * If `is_payment_confirmed = true`: "Payment Confirmed ✓" label.
* **Review Section (COMPLETED only):**
  * If not yet reviewed: "Leave a Review" prompt with star selector inline (14-day window).
  * If reviewed: shows the submitted review (stars + comment, read-only).
* **Reopen (CANCELED only):** "Reopen Task" action returns the task to `OPEN` after a confirmation dialog explaining that prior bids and chat will be cleared (see User Flows §5.9).
* **Delete (COMPLETED / CANCELED):** "Delete Task" in overflow menu — permanently removes the task and all its bids, messages, and reviews.
* **Chat:** "View Chat History" link — the archive is read-only with a lock-bar.

---

## 4. Fixer Mode Screens

### 4.1 Discovery Feed

**Map View (Default):**

**On first load — Location Permission Check:**
Before rendering the map or fetching tasks, the app checks location permission.
- If **not yet asked**: rationale modal — "FixIt needs your location to show you tasks nearby." — offers **Allow** and **Use Tel Aviv** (fallback that centers the map on Tel Aviv so the app is immediately useful).
- If **denied**: the map still renders, but centered on the Tel Aviv fallback. A banner explains manual mode with a link to Settings.
- If **granted**: map loads with the Fixer's GPS position centered.

* **Full-screen Google Map** with color-coded category markers for open tasks.
* **Work-area search:** a search bar (Google Places autocomplete) lets the Fixer look up jobs in a specific area (e.g., "Ramat Gan") instead of using GPS. The map re-centers and the discovery query re-runs against that location.
* **Tapping a marker** shows a Bottom Preview Card: task title, category, urgency chip, budget (or "Quote Required"), general location name, distance from the current center point, and a "View Details" button.
* **Stats bar:** small pills above the map — **Open Jobs**, **New** (jobs the Fixer hasn't bid on), **Already Bid**, **Range** (opens the filter panel).
* **Filter panel:** distance is a **slider** (up to a configurable max); budget is a **min/max range slider**; urgency filter chips; category multi-select chips. There are no fixed distance/price bracket presets.
* **Toggle:** "Map | List" switch.

**List View:**
* Vertical scrollable list of Task Cards. Each card shows: task title, category icon, urgency chip, budget (or "Quote Required"), general location name + distance, time posted, and current bid count.
* Same filter panel as Map View.
* **Empty State:** "No tasks found in your area. Try expanding your distance filter or searching a different work area."

### 4.2 Task Details — Fixer View
* **Photo Carousel:** Horizontal swipeable gallery of task photos.
* **Details Section:**
  * Title, description, category badge.
  * Budget: displayed as "₪[amount]" or "Quote Required".
  * General location shown on a small map (exact address hidden).
  * Requester info: avatar and name. Tappable to view Public Profile.
* **Bid Count:** Shown below the location map — "X bids submitted".
* **Sticky Bottom Bar:**
  * Default: "Submit Bid" button (primary, green).
  * If Fixer already bid: "Bid Submitted ✓" (disabled).
  * If task has reached 15 bids: "No longer accepting bids" (disabled, gray).

### 4.3 Bid Submission Modal
* **Overlay modal** sliding up from the bottom.
* **Price Input:** Large numeric input with currency symbol (₪). Placeholder: "Your price offer".
* **Pitch Input:** Multi-line text area. Placeholder: "Tell the requester why you're the right fit..."
* **Action:** "Send Offer" button (primary). "Cancel" to dismiss.
* **Validation:** Price must be > 0. Pitch must not be empty.

> **Pre-bid Clarification** — superseded by shipped pre-acceptance chat. A Requester can open a chat with any Fixer who has already bid on the task and answer clarification questions before accepting (see User Flows §5.2). Fixers still have to submit a concrete price bid first.

### 4.4 My Bids (Bid Tracker)
* **Tab Filter Bar:** tabs to filter by status: **Active** (Pending + Accepted with task in `OPEN` / `IN_PROGRESS`), **Pending**, **Accepted**, **Completed**, **Rejected**, **Withdrawn**.
* **Bid Cards:** each card shows: task title, category icon, general location, offered price, status badge (color-coded), and a compact set of actions per status:
  * **Pending:** "Edit bid", "Withdraw".
  * **Accepted / IN_PROGRESS:** "Chat with Requester", "Cancel job" (reverts task to `OPEN`), "Confirm completion" (once the Requester has confirmed payment).
  * **Rejected / Withdrawn:** "Reactivate" (when the task is still `OPEN` — sends the bid back to `PENDING`).
* **Bulk action:** "Delete All" in an overflow menu for the current filter (with confirmation).
* **Tapping a card** navigates to the Task Details screen (Fixer view if OPEN, or IN_PROGRESS view if accepted).
* **Empty State:** per-filter empty message (e.g. "No withdrawn bids").

### 4.5 Fixer Profile Management
* **Header:** Large avatar (tappable to change), full name, overall Fixer rating (e.g., "4.8 ★ (23 reviews)").
* **Edit Profile Button:** Opens an editable form for name, bio, phone number.
* **Specializations Section:**
  * Label: "What do you work on?"
  * Multi-select chips for each Category: Assembly / Mounting / Moving / Painting / Plumbing / Electricity / Outdoors / Cleaning / Other.
  * Selected chips are highlighted. At least one should be selected.
* **Payment Section:**
  * Label: "Payment Link (Bit / Paybox)"
  * Input field with current URL or placeholder.
  * Helper text: "Requesters will use this link to pay you."
  * If no payment link is set: a soft warning banner shown on the profile — "You haven't added a payment link — Requesters may not be able to pay you easily." No hard block on bidding.
* **Portfolio Section:**
  * Grid of uploaded images (3-column).
  * "+" card to add a new photo with an optional caption.
  * Long-press or "X" overlay to delete.
* **Certifications Section:**
  * List of uploaded documents. Each item shows: category, title, upload date, and a review-status badge (Pending / Approved / Rejected).
  * "Add Certification" button to upload a new document with a category and title; it enters admin review as `Pending`.
  * **Note:** category is currently restricted to `PLUMBING` and `ELECTRICITY`, and the category must be in the Fixer's specializations first.
* **Identity Verification Section:**
  * Status badge (None / Pending / Approved / Rejected).
  * When status is None or Rejected: "Submit ID + selfie" CTA opens the upload flow (two Firebase Storage uploads → `POST /api/users/me/verification`).
  * When status is Approved: a verified badge is displayed on the profile.
* **Push Notifications Toggle:** on/off switch to enable / disable Expo push delivery for this device.
* **Reviews Section:** "View My Reviews" link navigating to a list of received reviews.

---

## 5. Shared Screens

### 5.1 Conversation List
* **Header:** "Messages"
* **List of Chat Threads:** Each thread row shows:
  * Other party's avatar and name.
  * Task title (smaller, secondary text).
  * Last message preview (truncated to one line) and timestamp.
  * Unread message count badge (blue circle with number).
* **Sorted** by most recent message (newest at top).
* **Tapping a thread** opens the Chat Interface for that task.
* **Empty State:** "No conversations yet. Start chatting when a bid is accepted!"

### 5.2 Chat Interface
* **Header:** Other user's avatar and name (tappable to view profile) + Task title (tappable to view task).
* **Body:** Chat bubbles — sent messages right-aligned (colored), received messages left-aligned (gray). Each bubble shows message text, timestamp, and a **read-receipt tick** (✓ sent, ✓✓ read) driven by real-time `messages_read` events.
* **Scroll:** Auto-scrolls to the latest message on open. Older messages loaded on scroll-up (paginated, 30 per page).
* **Footer:** Text input field with placeholder "Type a message...", Send button on the right.
* **Read-Only Modes:**
  * **COMPLETED task:** lock-bar reads "This task is completed. Chat is read-only."
  * **CANCELED task:** lock-bar reads "Task canceled. Chat is closed."
  * **Fixer withdrew / task auto-locked in a mid-flow edge case:** lock-bar reads "The fixer withdrew from this task."

### 5.3 Notifications Center
* **Header:** "Notifications" with **"Mark all as read"** and **"Delete all"** actions.
* **Role filter:** the list is auto-filtered to the current mode (Requester vs. Fixer). Switching modes updates the filter.
* **List of Notification Cards:** Each card shows: type icon, bold title, body, timestamp, and an unread highlight.
* **Tapping a notification:** marks it as read and navigates to the relevant screen (Task Details, Chat, My Bids, Fixer Profile for cert/verification decisions, etc.).
* **Per-item action:** long-press / overflow to delete a single notification (`DELETE /api/notifications/:id`).
* **Empty State:** "You're all caught up! No new notifications."

### 5.4 Public Profile View
* Shown when tapping another user's name or avatar anywhere in the app.
* **Header:** Avatar, full name, badges — **Email Verified** (if verified) and **Identity Verified** (if the Fixer's identity verification is `APPROVED`).
* **Rating Display:** Bayesian-shrunk aggregate rating (e.g., "★ 4.8 (23 reviews)"). Hidden if the Fixer has no reviews yet.
* **Bio Section:** User's bio text.
* **Portfolio Section (Fixers only):** Scrollable image gallery of past work.
* **Certifications Section (Fixers only):** Approved certifications rendered as trusted category badges (`Certified Plumber`, `Certified Electrician`). Pending / rejected certs are not shown publicly.
* **Reviews Tab:** Chronological list of reviews from other users. Each review shows: reviewer name, star rating, comment, and date. The review's subject can **report** an inappropriate review from here (see Admin Dashboard §6.1).

### 5.5 Review Screen
Shown to the **Requester only**, accessible from the completed Task Details screen. The prompt is visible for 14 days after task completion; after that it is hidden.
* **Header:** "Rate your experience with [Fixer Name]" + their avatar.
* **Star Selector:** 5 large tappable stars. Selected stars are filled/colored.
* **Label:** Dynamic text based on selection (1="Poor", 2="Fair", 3="Good", 4="Very Good", 5="Excellent").
* **Comment Input:** Optional multi-line text area. Placeholder: "Share details about your experience..."
* **Action:** "Submit Review" button (primary). Disabled until at least 1 star is selected.
* **Confirmation:** After submission, a success message: "Thank you for your review!" and navigation back to the task.
* **Expired State:** If the 14-day window has passed and no review was submitted, the section shows "Review period has ended" with no action available.

### 5.6 Settings Screen
* Reached via the "Profile" bottom tab in Requester mode (`SettingsScreen`).
* **Account Section:**
  * Email (read-only, displayed for reference).
  * Phone number (editable).
  * "Change Password" link (triggers Firebase password reset email).
* **Preferences Section:**
  * Language: EN / HE toggle (with RTL layout switch).
  * Push Notifications: on/off toggle.
* **Session Section:**
  * "Log Out" button (triggers Firebase signOut).
  * **"Delete Account"** — permanent account deletion (cancels active tasks, anonymizes past reviews, deletes the Firebase Auth account server-side). Requires typed confirmation.

### 5.7 Past Conversations
Reached from the Conversation List's overflow menu. Shows read-only archived threads (COMPLETED / CANCELED tasks the user was a party to) grouped by task. Tapping opens the archived chat in read-only mode with the same lock-bar treatment as §5.2. Useful for the demo since real usage produces a lot of archived history.

### 5.8 App Tutorial (First-Run Onboarding)
A short slide-based tutorial shown once per Requester account on first entry into the Requester workspace. Introduces the map, task creation, and bidding. Dismissal is persisted in AsyncStorage under `requesterTutorialSeen_${uid}` — subsequent logins skip it.

### 5.9 Become a Fixer Onboarding
A stack screen accessed via the "Become a Fixer" CTA in the top nav (visible only to users who have never activated the Fixer role). Walks the user through the Fixer role expectations, prompts specializations, and on completion sets a `fixerOnboardingSeen_${uid}` flag in AsyncStorage. After completion the workspace switcher CTA flips to "Open Fixer Workspace".

### 5.10 Accessibility Widget (Web)
On the web target, an on-page floating widget (bottom-right) opens a panel with user-facing accessibility controls:
- Font-size scale
- High-contrast mode
- Monochrome (grayscale) mode
- Underline links
- Reset all

Aimed at WCAG 2.1 / Israeli standard 5568 compliance. Preferences persist in `localStorage` and re-apply on next page load. Not present on native (mobile devices already expose OS-level accessibility APIs).

### 5.11 Idle Auto-Logout Warning (Web)
A modal shown a short time before the web session times out from inactivity. Options: "I'm still here" (extends the session) or "Log out". If the user does nothing, they are signed out automatically and returned to the Welcome screen.

---

## 6. Admin Dashboard

Reached by users with `is_admin = true`. Not a role like Requester / Fixer — it's an additional workspace surfaced via a dedicated navigator. Every route is gated by the `adminAuth` middleware.

### 6.1 Reported Reviews
* List of reviews that have been reported by their subject.
* Each row: reviewer, reviewee, rating, comment, report reason, and reporter details.
* Actions: **Hide review** (`is_hidden = true`) or **Dismiss report** (clears the flag).

### 6.2 Pending Certifications
* List of certifications awaiting admin decision.
* Each row: Fixer name + avatar, category badge, title, upload date, and a "View document" link (proxied via `GET /api/admin/download-photo`).
* Actions: **Approve** or **Reject** (with an optional rejection note). Approval turns on the certified-category badge on the Fixer's public profile.

### 6.3 Pending Identity Verifications
* List of Fixers awaiting identity verification.
* Each row: Fixer name + avatar, submission date, "View ID" and "View Selfie" links (proxied through the admin download endpoint).
* Actions: **Approve** (verified badge granted) or **Reject** (with optional reason).

### 6.4 User Management
* Simple list of users with search + role / verification status filters. Tap through to inspect an individual user record.
