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
* **Logo:** Fixlt branding and tagline centered on screen.
* **Language Toggle:** EN / HE switch at the top-right corner. *(Added when Hebrew support is implemented — not present in Phase 1.)*
* **Actions:** Two prominent buttons stacked vertically — "Log In" and "Create Account".
* **Background:** Subtle illustration or gradient conveying handyman/services theme.

### 1.2 Registration Screen
* **Inputs:** Full Name, Email, Password, Confirm Password (stacked vertically).
* **Optional Input:** Phone Number (labeled "Optional — for contact purposes").
* **Validation:** Inline error messages beneath each field in real-time (e.g., "Passwords do not match", "Email already in use").
* **Action:** "Create Account" button at the bottom. On success, navigates to the Dashboard.
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

### 1.5 Email Verification Banner (Inline Component)
* Not a separate screen. A persistent banner at the top of the Dashboard.
* **Content:** "Please verify your email. Check your inbox or [Resend Link]."
* **Style:** Amber/warning background, dismissible via an X button (reappears on next session if still unverified).
* **Disappears** once `emailVerified` is true on the Firebase user object.

---

## 2. Global UI Elements

### 2.1 Top Navigation Bar
* **Left:** App logo / name ("Fixlt").
* **Center:** Mode Toggle — segmented control switching between "Requester" and "Fixer". The active mode is visually highlighted.
* **Right:** Notification Bell (with unread count badge) and Language Toggle (EN/HE). *(Language toggle added when Hebrew support is implemented.)*

### 2.2 Bottom Tab Navigation (Mobile)
Tabs change based on the active mode:

**Requester Mode:**
| Tab | Icon | Screen |
|---|---|---|
| Home | House | Requester Dashboard |
| Create | + Circle | Task Creation Wizard |
| Messages | Chat Bubble | Conversation List |
| Profile | Person | Profile & Settings |

**Fixer Mode:**
| Tab | Icon | Screen |
|---|---|---|
| Find Jobs | Search / Map | Discovery Feed |
| My Bids | List | Bid Tracker |
| Messages | Chat Bubble | Conversation List |
| Profile | Person | Profile & Settings |

> **Navigation rule:** The Mode Toggle is only visible on **root screens** (Requester Dashboard, Discovery Feed, Conversation List, Profile). It is hidden automatically when the user is inside a focused flow — Task Creation Wizard, Chat Interface, Task Details, or any screen that is not a root tab. This prevents accidental mode switches that would lose in-progress work.

### 2.3 Web Navigation
On web, the bottom tabs are replaced by a sidebar or horizontal top menu with the same items. The Mode Toggle remains in the top bar.

---

## 3. Requester Mode Screens

### 3.1 Requester Dashboard
* **Email Verification Banner** (if unverified) — at the very top.
* **Header:** "Welcome back, [Name]" with avatar.
* **Active Tasks Section:** Horizontal scrollable cards for tasks with status `OPEN` or `IN_PROGRESS`. Each card shows:
  * Task title, category icon, status badge (color-coded).
  * Bid count (e.g., "3 bids") for OPEN tasks.
  * Assigned Fixer name and avatar for IN_PROGRESS tasks.
* **Quick Action:** Floating action button (FAB) in bottom-right: "+" to create a new task.
* **Past Tasks Section:** Vertical list of `COMPLETED` and `CANCELED` tasks. Each shows title, date, final price, and Fixer name.
* **Empty State:** If no tasks exist: illustration + "Post your first task and get help today!" with a "Create Task" button.

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
* **Grid:** Visual grid of category cards with icons and labels:
  * ⚡ Electricity | 🔧 Plumbing | 🔨 Carpentry | 🎨 Painting | 📦 Moving | 🛠 General
* **Selection:** Single-select. Selected card is visually highlighted.
* **Navigation:** "Back" and "Next" buttons.

**Step 4 — Budget:**
* **Toggle:** Two options — "Fixed Price" and "Quote Required".
* **Fixed Price:** Shows a numeric input with currency symbol (₪). Placeholder: "Enter your budget".
* **Quote Required:** No input — a label explains: "Fixers will propose their own price."
* **Navigation:** "Back" and "Next" buttons.

**Location Permission (triggered on entering Step 5):**
Before displaying the map, the app checks whether location permission has been granted.
- If **not yet asked**: Show a rationale modal — "Fixlt needs your location to drop a pin for your task's general area. Your exact home address is entered separately and stays private." — with "Allow" and "Skip for now" buttons. "Allow" triggers the native iOS/Android permission dialog.
- If **denied**: The map is replaced with a text input labeled "General Area (e.g., 'Hadar, Haifa')" and a note: "Location access was denied. You can enable it in your device Settings, or type your neighborhood manually."
- If **granted**: Map loads normally.

**Step 5 — Location:**
* **Map View:** Interactive Google Map. User drops a pin for the general area (neighborhood level). Below the map: auto-populated general location name (e.g., "Hadar, Haifa").
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
* **Bids Section (Bottom Sheet or Tab):**
  * Header: "Received Bids ([count] / 15)"
  * List of Bid Cards, each showing:
    * Fixer avatar, full name, rating (e.g., "4.8 ★ (23 reviews)").
    * Offered price (prominently displayed).
    * First line of their pitch message.
    * Two buttons: "Accept" (green) and "Decline" (red outline).
  * Tapping a bid card expands it or navigates to the Fixer's Public Profile.
* **Empty State (no bids yet):** "No bids yet. Sit tight — Fixers in your area will see your task!"
* **Full State (15 bids reached):** A banner at the top of the bids section: "This task is no longer accepting new bids." Existing bids can still be managed.
* **Actions:** "Cancel Task" option in a menu (top-right "..." icon).

### 3.4 Task Details — Status: IN_PROGRESS
* **Header:** Task title, status badge ("In Progress" — blue).
* **Assigned Fixer Card:** Avatar, name, rating, phone number (tap to call). "View Profile" link.
* **Photo Carousel:** Task photos.
* **Details Section:** Description, budget, exact address (visible to both parties now).
* **Chat Button:** Prominent button or tab: "Chat with [Fixer Name]" with unread message badge.
* **Actions:**
  * "Mark as Completed" button (primary, green) — shown when ready.
  * "Cancel Task" in overflow menu (with warning).

### 3.5 Task Details — Status: COMPLETED
* **Header:** Task title, status badge ("Completed" — gray/green check).
* **Summary:** Final price, Fixer name, completion date.
* **Payment Section:**
  * If `is_payment_confirmed = false` and Fixer **has** a `payment_link`: "Pay Fixer" button (deep-links to Bit/Paybox) + "Confirm Payment" button below it.
  * If `is_payment_confirmed = false` and Fixer **has no** `payment_link`: A message — "This Fixer hasn't set up a payment link. Contact them directly." + Fixer's phone number as a tappable link (if available).
  * If `is_payment_confirmed = true`: "Payment Confirmed ✓" label.
* **Review Section:**
  * If not yet reviewed: "Leave a Review" prompt with star selector inline.
  * If reviewed: Shows the submitted review (stars + comment, read-only).
* **Chat:** "View Chat History" link (read-only archive).

---

## 4. Fixer Mode Screens

### 4.1 Discovery Feed

**Map View (Default):**

**On first load — Location Permission Check:**
Before rendering the map or fetching tasks, the app checks location permission.
- If **not yet asked**: Show a rationale modal — "Fixlt needs your location to show you tasks nearby. You can change this anytime in Settings." — "Allow" triggers the native dialog.
- If **denied**: Full-screen fallback shown — a city/neighborhood search bar ("Enter your city or area") lets the Fixer manually enter a location to use as the discovery center point. A banner reads: "Using manual location. Enable GPS in Settings for automatic detection."
- If **granted**: Map loads with the Fixer's current GPS position centered.

* **Full-screen Google Map** with custom markers for open tasks. Markers are color-coded or icon-coded by category.
* **Tapping a marker** shows a Bottom Preview Card:
  * Task title, category, budget (or "Quote Required"), general location name, distance from Fixer.
  * "View Details" button.
* **Filters Bar:** Horizontal scrollable chips above the map:
  * Distance: 5km / 10km / 25km / 50km (single select).
  * Category: Electricity / Plumbing / Carpentry / etc. (multi-select).
  * Price: "₪0–100" / "₪100–500" / "₪500+" (single select or custom range).
* **Toggle:** "Map | List" switch in the top-right.

**List View:**
* Vertical scrollable list of Task Cards. Each card shows:
  * Task title, category icon, budget (or "Quote Required").
  * General location name + distance (e.g., "Hadar, Haifa — 2.3 km").
  * Time posted (e.g., "Posted 2 hours ago").
  * Number of existing bids (e.g., "5 bids").
* Same filter bar as Map View at the top.
* **Empty State:** "No tasks found in your area. Try expanding your distance filter."

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

> **`Stretch Goal` — Pre-bid Clarification:** Allow a Fixer to submit a bid with price ₪0 (meaning "I need to assess on-site before quoting") or to send a structured "Clarification Request" message to the Requester before committing to a price. This would require a pre-bid chat or Q&A flow and is deferred to a future phase.

### 4.4 My Bids (Bid Tracker)
* **Tab Filter Bar:** Horizontal tabs to filter by status: All / Pending / Accepted / Rejected / Withdrawn.
* **Bid Cards:** Each card shows:
  * Task title, category icon, general location.
  * Offered price.
  * Status badge (color-coded: Pending=yellow, Accepted=green, Rejected=red, Withdrawn=gray).
  * Timestamp: "Submitted 3 hours ago".
* **Tapping a card** navigates to the Task Details screen (Fixer view if OPEN, or IN_PROGRESS view if accepted).
* **Swipe Action (Pending bids only):** Swipe left to reveal "Withdraw" button.
* **Empty State:** "You haven't submitted any bids yet. Start exploring tasks!"

### 4.5 Fixer Profile Management
* **Header:** Large avatar (tappable to change), full name, overall Fixer rating (e.g., "4.8 ★ (23 reviews)").
* **Edit Profile Button:** Opens an editable form for name, bio, phone number.
* **Specializations Section:**
  * Label: "What do you work on?"
  * Multi-select chips for each Category: Electricity / Plumbing / Carpentry / Painting / Moving / General.
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
* **Certifications Section:** *(Stretch Goal)*
  * List of uploaded documents. Each item shows: title and upload date. No status badge.
  * "Add Certification" button to upload a new document with a title.
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
* **Body:** Chat bubbles — sent messages right-aligned (colored), received messages left-aligned (gray). Each bubble shows message text and timestamp. Read receipts (✓ sent, ✓✓ read) are a *Planned* addition — not in Phase 1.
* **Scroll:** Auto-scrolls to the latest message on open. Older messages loaded on scroll-up (paginated).
* **Footer:** Text input field with placeholder "Type a message...", Send button (icon) on the right.
* **Read-Only Mode (COMPLETED tasks):** Footer is replaced with a label: "This task is completed. Chat is read-only."

### 5.3 Notifications Center
* **Header:** "Notifications" with "Mark All as Read" link in top-right.
* **List of Notification Cards:** Each card shows:
  * Icon representing the notification type (bid icon, chat icon, checkmark, etc.).
  * Title (bold) and body text.
  * Timestamp (e.g., "2 hours ago").
  * Unread indicator: subtle background highlight for unread items.
* **Tapping a notification:** Marks it as read and navigates to the relevant screen:
  * `NEW_BID` → Task Details (bid management).
  * `BID_ACCEPTED` / `BID_REJECTED` → My Bids.
  * `NEW_MESSAGE` → Chat Interface.
  * `TASK_COMPLETED` / `TASK_CANCELED` → Task Details.
* **Empty State:** "You're all caught up! No new notifications."

### 5.4 Public Profile View
* Shown when tapping another user's name or avatar anywhere in the app.
* **Header:** Avatar, full name, "Email Verified" badge (if verified).
* **Rating Display:** "★ 4.8 (23 reviews)" — shown only if the user has completed jobs as a Fixer. Hidden if they have no reviews yet.
* **Bio Section:** User's bio text.
* **Portfolio Section (Fixers only):** Scrollable image gallery of past work.
* **Certifications Section (Fixers only):** *(Stretch Goal)* List of uploaded certificates with titles and upload dates. No verification status badge.
* **Reviews Tab:** Chronological list of reviews from other users. Each review shows: reviewer name, star rating, comment, and date.

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
* Accessible from the Profile tab (gear icon or "Settings" link).
* **Account Section:**
  * Email (read-only, displayed for reference).
  * Phone number (editable).
  * "Change Password" link (triggers Firebase password reset email).
* **Preferences Section:**
  * Language: EN / HE toggle (with RTL layout switch). *(Visible only when Hebrew support is implemented.)*
  * Push Notifications: on/off toggle.
* **Actions:**
  * "Log Out" button (red text, triggers Firebase signOut).
  * "Delete Account" link (shown only if the stretch-goal account deletion flow is implemented later).
