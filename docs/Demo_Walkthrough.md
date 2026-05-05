# Demo Walkthrough Script

Step-by-step flow for presenting the FixIt app during the final project demo.

---

## Pre-Demo Checklist

- [ ] Backend is running (local or deployed)
- [ ] Frontend is running (Expo Web or deployed on Vercel)
- [ ] Database is seeded (`npx prisma db seed`)
- [ ] Two browser tabs open (or one browser + phone)

---

## Flow 1: Requester Journey

### 1.1 Register as a Requester
1. Open the app → Landing page loads with hero animation
2. Click **"Get Started"** → Auth screen
3. Register with email + password → Auto-sync to backend
4. Redirected to **Requester Dashboard**

### 1.2 Explore the Dashboard
1. Show the **greeting** (time-of-day based)
2. Scroll through the **category carousel** (real images)
3. Point out the **quick actions** section
4. Show the **how it works** steps

### 1.3 Create a Task
1. Tap a category (e.g., "Plumbing") → Create Task screen
2. Fill in:
   - Title: "תיקון ברז במטבח"
   - Description: "ברז המטבח מטפטף כבר שבוע"
   - Suggested price: ₪200
   - Location: Enter address (map pin appears)
   - Optional: Add a photo
3. Submit → Task created, redirected to My Tasks

### 1.4 View My Tasks
1. Navigate to **My Tasks** tab
2. Show the **workspace header** with stats (Open / In Progress / Pending Bids / To Review)
3. Tap **"In Progress"** pill → filters to only in-progress tasks
4. Tap again → clears filter
5. Show an open task with bid count

### 1.5 Review Bids & Accept
1. Tap on a task with bids → Task Details
2. Scroll to **Bids section** → see fixer profiles, prices, descriptions
3. Tap a fixer's avatar → view their **Public Profile** (rating, reviews, portfolio)
4. **Accept** a bid → task moves to IN_PROGRESS
5. Other bids are auto-rejected

---

## Flow 2: Fixer Journey

### 2.1 Switch to Fixer Mode
1. In the sidebar/nav, tap the **mode toggle** → switch to "Fixer"
2. Show the **Fixer Discovery** screen with the map

### 2.2 Browse Jobs on the Map
1. Show task pins on the map around the current area
2. Tap a pin → preview card slides up with task info
3. Show the **stats bar**: Open Jobs | New | Already Bid | Range
4. Tap **"New"** → map filters to jobs not yet bid on
5. Tap **"Range"** → filter panel opens (distance slider + budget)

### 2.3 Submit a Bid
1. Tap a task pin or list card → **Task Details (Fixer view)**
2. Review task info, location, photos
3. Tap **"Place Bid"**
4. Enter price + description → Submit
5. Bid confirmation shown

### 2.4 View Active Bids
1. Tap **"Already Bid"** stat → shows only tasks with active bids
2. Navigate to **My Bids** tab → see bid status (Pending / Accepted / Rejected)

---

## Flow 3: Real-Time Chat

### 3.1 Open Chat
1. Once a bid is accepted, both parties see a **Messages** tab badge
2. Navigate to **Messages** → conversation list shows the task
3. Tap the conversation → chat opens

### 3.2 Send Messages
1. Requester sends: "מתי אתה יכול להגיע?"
2. Fixer responds: "אני פנוי מחר בבוקר"
3. Show real-time delivery (no refresh needed)
4. Tap the **task title** in the header → navigates to task details

### 3.3 Read Receipts
1. Point out the ✓✓ indicators on sent messages
2. When the other side opens the chat → messages marked as read

---

## Flow 4: Complete & Review

### 4.1 Mark Task as Completed
1. As the **Requester**, go to My Tasks → In Progress task
2. Tap **"Mark Completed"** → confirmation dialog
3. Confirm → task moves to Completed
4. Chat messages are deleted (privacy)

### 4.2 Leave a Review
1. In My Tasks → "To Review" pill filters completed tasks awaiting review
2. Tap the task → Review form appears
3. Select rating (1-5 stars) + write comment
4. Submit → review visible on Fixer's public profile

### 4.3 Confirm Payment
1. Requester taps **"Confirm Payment"** on the completed task
2. Shows Bit/Paybox deep-link (external payment)
3. Mark payment as sent

---

## Flow 5: Additional Features

### 5.1 Settings
1. Navigate to **Settings** screen
2. Show account info (email, verified status)
3. Toggle **Push Notifications** on
4. Change password (sends reset email)

### 5.2 Fixer Profile
1. As fixer, go to **Profile** tab
2. Show specializations, rating, review count
3. Add a **portfolio item** (photo + description)
4. Edit bio

### 5.3 Accessibility Widget
1. Click the **accessibility icon** (bottom-right)
2. Toggle **High Contrast** mode → dark theme applied
3. Increase font size → text scales up
4. Toggle **Monochrome** → grayscale filter
5. **Reset All** → back to normal

### 5.4 Notifications
1. Show the **notification bell** with unread count
2. Tap → notification list (bid received, bid accepted, new message, etc.)
3. Mark all as read

---

## Key Demo Talking Points

| Feature | Tech |
|---------|------|
| Real-time chat | Socket.io rooms per task |
| Location-based discovery | PostGIS spatial queries |
| Auth | Firebase (client) + Admin SDK (server) |
| Push notifications | Expo Push Service |
| Cross-platform | Expo (iOS/Android/Web) |
| Bilingual-ready | RTL/LTR support in theme |
| Accessibility | CSS injection widget (web) |

---

## Test Accounts (seeded)

| Name | Email | Role | Password |
|------|-------|------|----------|
| Neta Bivas | neta@example.com | Requester | guyguyguy |
| Guy Stein | stein@example.com | Requester | guyguyguy |
| Guy Zilberstein | zilber@example.com | Requester | guyguyguy |
| Guy Shick | shick@example.com | Fixer | guyguyguy |
| Guy Toledo | guy@example.com | Fixer | guyguyguy |
| Avi Ron | avi@example.com | Fixer | guyguyguy |
