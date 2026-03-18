# Screen Layouts & UI Plan

## 1. Global UI Elements
* **Top Navigation Bar:** Contains the "Mode Toggle" (Requester <-> Fixer), Language Toggle (EN/HE), and Notification Bell.
* **Bottom Tab Navigation (Mobile):** Changes based on the active mode.

## 2. Requester Mode Screens

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

## 3. Fixer Mode Screens

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

## 4. Shared Screens

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
