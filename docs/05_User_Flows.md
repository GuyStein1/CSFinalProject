# User Flows

## 1. Onboarding & Authentication Flow

### 1.1 Registration
1. User downloads app / opens web platform.
2. Selects language (English/Hebrew).
3. Taps "Create Account".
4. Enters Full Name, Email, Password (with confirmation), and optionally a Phone Number.
5. Client calls Firebase `createUserWithEmailAndPassword()`. On success, Firebase returns a signed-in user with an ID Token.
6. Client immediately calls `POST /api/auth/sync` (with the Firebase ID Token) to create the local User record in PostgreSQL with the provided `full_name` and `phone_number`.
7. Firebase sends a verification email automatically via `sendEmailVerification()`. A banner on the dashboard prompts the user to verify. The app is fully usable before verification, but an "Email Verified" badge is only shown on their profile once confirmed.
8. Fills out basic profile (Avatar, Bio) — can be skipped and completed later.
9. Lands on the main dashboard. Can toggle between "Requester" and "Fixer" modes via a top navigation switch.

### 1.2 Login
1. User opens app / web platform.
2. Enters Email and Password.
3. Client calls Firebase `signInWithEmailAndPassword()`.
4. On success, Firebase returns an ID Token. User lands on the dashboard.
5. On failure, the client displays the Firebase error message inline (e.g., "Invalid email or password").

### 1.3 Session Persistence
* Firebase SDK automatically persists the auth session on the device.
* On app launch, the SDK checks for an existing session and silently refreshes the ID Token if needed.
* If a valid session exists, the user sees the dashboard directly (no login screen).
* If no session exists, the user is redirected to the Login screen.

### 1.4 Logout
* User taps "Log Out" in Settings.
* Client calls Firebase `signOut()`. Local session is cleared.
* User is returned to the Login screen.

## 2. The Requester Flow: Getting a Job Done
1. **Task Creation:**
   * Taps "New Task" (+ button).
   * Enters Title & Description.
   * Uploads photos from camera/gallery.
   * Selects Category.
   * Sets Budget (Fixed, Range, or "Quote Required").
   * Sets Location (Drops a pin for general area, enters exact street address privately).
   * Publishes Task.
2. **Reviewing Bids:**
   * Receives push notifications as bids come in.
   * Opens Task Dashboard to see a list of bids.
   * Taps a bid to view the Fixer's profile, rating, portfolio, and their specific pitch/price.
3. **Accepting & Coordinating:**
   * Accepts the preferred bid.
   * The exact address is revealed to the Fixer.
   * A real-time chat channel opens between Requester and Fixer.
   * They coordinate exact arrival times.
4. **Completion & Payment:**
   * Fixer completes the job.
   * Requester taps "Pay Fixer", which deep-links to the Fixer's Bit/Paybox app.
   * Requester marks task as "Paid & Completed".
   * Requester leaves a 1-5 star rating and written review for the Fixer.

## 3. The Fixer Flow: Finding & Completing Work
1. **Profile Setup (Optional but recommended):**
   * Fixer adds a Bio.
   * Uploads Portfolio photos of past work.
   * Uploads Certifications.
   * Adds their personal Bit/Paybox payment link.
2. **Discovery:**
   * Opens the "Find Jobs" Map or List view.
   * Applies filters (e.g., "Plumbing within 10km").
   * Browses general location pins of open tasks.
3. **Bidding:**
   * Taps a task to view photos, description, and budget.
   * Submits a Bid with a specific Price Offer and a pitch message.
4. **Job Execution:**
   * Receives notification when bid is accepted.
   * Views the exact address and navigates to the location.
   * Uses in-app chat to update the Requester ("I'm 5 mins away").
   * Completes the physical work.
5. **Post-Job:**
   * Receives payment via Bit/Paybox.
   * Leaves a rating and review for the Requester.
