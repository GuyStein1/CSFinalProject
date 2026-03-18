# Screen Layouts & UI Plan

## 1. Authentication Screens

### 1.1 Welcome / Landing Screen
* **Logo:** Fixlt branding and tagline.
* **Language Toggle:** EN / HE switch at the top.
* **Actions:** Two prominent buttons — "Log In" and "Create Account".

### 1.2 Registration Screen
* **Inputs:** Full Name, Email, Password, Confirm Password.
* **Optional Input:** Phone Number (labeled as optional, for contact purposes).
* **Validation:** Inline error messages beneath each field (e.g., "Passwords do not match", "Email already in use").
* **Action:** "Create Account" button. On success, navigates to the Dashboard.
* **Footer Link:** "Already have an account? Log In".

### 1.3 Login Screen
* **Inputs:** Email, Password.
* **Validation:** Inline error for invalid credentials.
* **Action:** "Log In" button. On success, navigates to the Dashboard.
* **Footer Link:** "Don't have an account? Sign Up".

### 1.4 Email Verification Banner (Inline on Dashboard)
* Not a separate screen. A dismissible banner at the top of the dashboard: "Please verify your email. Check your inbox or [Resend Link]."
* Client checks `firebase.auth().currentUser.emailVerified`. Banner disappears once true (after the user clicks the link and the token refreshes).

---

## 2. Global UI Elements
* **Top Navigation Bar:** Contains the "Mode Toggle" (Requester <-> Fixer), Language Toggle (EN/HE), and Notification Bell.
* **Bottom Tab Navigation (Mobile):** Changes based on the active mode.

## 3. Requester Mode Screens

### 2.1 Requester Home / Dashboard
* **Header:** "Welcome back, [Name]"
* **Active Tasks:** Horizontal scroll of currently open or in-progress tasks.
* **Quick Actions:** Big floating action button (FAB) or prominent card: "Create New Task".
* **Past Tasks:** List of completed jobs and receipts.

### 2.2 Task Creation Wizard (Multi-step or Long Form)
* **Step 1:** Title & Description.
* **Step 2:** Media Upload (Grid of thumbnails, + button).
* **Step 3:** Category Selection (Visual grid of icons: Plug, Wrench, Hammer, etc.).
* **Step 4:** Budget & Location (Map view to drop pin, text input for exact address).

### 2.3 Task Details & Bid Management
* **Top:** Task details, status badge, photos.
* **Bottom Sheet / List:** "Received Bids".
* **Bid Card:** Fixer Avatar, Name, Rating (⭐ 4.8), Offered Price, Snippet of pitch. "Accept" and "Decline" buttons.

## 4. Fixer Mode Screens

### 3.1 Fixer Discovery (Map / List)
* **Toggle:** Switch between Map View and List View.
* **Map View:** Google Maps integration with custom markers for open tasks. Tapping a marker shows a preview card at the bottom.
* **Filters Bar:** Horizontal scrolling chips (Distance, Category, Price).

### 3.2 Task Details (Fixer View)
* **Content:** Photos, Description, General Location Map, Requester Rating.
* **Action:** Sticky bottom bar with "Submit Bid" button.

### 3.3 Bid Submission Modal
* **Input:** Number pad for Price Offer.
* **Input:** Text area for Pitch/Message.
* **Action:** "Send Offer".

### 3.4 Fixer Profile Management
* **Header:** Avatar, Name, Overall Rating, "Edit Profile".
* **Payment Section:** Input field for Bit/Paybox link.
* **Portfolio Section:** Grid of uploaded images.
* **Certifications Section:** List of uploaded documents with status badges (Pending/Verified).

## 5. Shared Screens

### 4.1 Chat Interface
* Standard messaging UI.
* **Header:** Task Title, Other User's Name & Avatar.
* **Body:** Chat bubbles (Left/Right aligned).
* **Footer:** Text input, Send button.

### 4.2 Review Screen
* **Header:** "Rate your experience with [Name]"
* **Interactive:** 5 large selectable stars.
* **Input:** Optional text area for written feedback.
* **Action:** "Submit Review".
