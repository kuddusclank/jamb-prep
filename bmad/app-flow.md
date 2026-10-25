# Application Flow & Navigation Document
# JAMBPrep — User Journeys & Route Specifications

**Document Version:** 1.0.0  
**Status:** Approved Specification  

---

## 1. Route Map & Access Control Matrix

```
/ (Landing Page) [Public — Includes 10s Combination Prompt & Inline Course Search]
├── /combinations [Public — SEO Course → Subject Combination Finder & Lock-In Funnel]
├── /login [Public / Guest-only]
├── /register [Public / Guest-only — Displays Locked Course Combination Badge & Finder Link]
├── /pricing [Public]
├── /schools [Public — B2B School Cohort Calculator & Application]
│
├── /onboarding [Auth Required - Pre-fills Locked Course Combination + Round-Trip Link to /combinations?from=onboarding]
│
├── /dashboard [Auth Required]
│
├── /practice [Auth Required]
│   └── /practice/[sessionId] [Auth Required - Practice Engine]
│
├── /mock [Auth Required]
│   ├── /mock/instructions [Auth Required - Pre-exam confirmation]
│   └── /mock/[attemptId] [Auth Required - Focused CBT Interface]
│
├── /results/[attemptId] [Auth Required - Diagnostic Scorecard]
│
├── /analytics [Auth Required - Long-term Performance Trends]
├── /bookmarks [Auth Required - Saved Revision Bank]
├── /referrals [Auth Required - Refer-and-Earn Tracker & Rewards]
├── /settings [Auth Required - Profile & Subject Preferences]
│
├── /checkout [Auth Required - Paystack Subscription Flow]
│
└── /admin [Admin Role Only]
    ├── /admin/dashboard [Platform KPI Overview]
    ├── /admin/questions [Question Bank List & Filters]
    ├── /admin/questions/new [Single Question Manual Editor]
    ├── /admin/questions/import [Bulk CSV/JSON Importer]
    ├── /admin/topics [Syllabus & Topic Hierarchy Manager]
    └── /admin/subscriptions [Transaction & Entitlement Audits]
```

---

## 2. End-to-End User Journeys

### Journey 1: Registration & Onboarding
```
[Landing Page (/)]
       │
       ▼
[Register Form (/register)]
  • Name, Email, Password (or Google Sign-In)
       │
       ▼
[Onboarding Wizard (/onboarding)]
  • Step 1: Confirm Use of English (Auto-locked)
  • Step 2: Select 3 Elective Subjects (from 7 available)
  • Step 3: Enter Target Score (e.g., 280/400)
  • Step 4: Pick Intended Course & Institution (Optional)
       │
       ▼
[Student Dashboard (/dashboard)]
  • Welcome Banner & Diagnostic Callout
  • Primary CTA: "Take Free Diagnostic Mock Exam"
```

---

### Journey 2: Topic-Based Practice Session
```
[Dashboard (/dashboard)]
       │
       ▼
[Practice Selection (/practice)]
  • Choose 1 of your 4 enrolled subjects
  • Select a specific Syllabus Topic (e.g., "Calculus - Differentiation")
  • Choose Difficulty or "All Questions"
       │
       ▼
[Practice Room (/practice/[sessionId])]
  • Question displayed with KaTeX math rendering and options A–D
  • Candidate selects an option:
      ├── Immediate visual feedback (Green check or Red X)
      ├── Explanation drawer slides down with step-by-step working
      └── Next Question button becomes active
  • Quota Check: If Free User reaches 15 questions today:
      └── Bottom sheet modal: "Daily limit reached. Upgrade for ₦1,000 to practice unlimited."
```

---

### Journey 3: The Authentic CBT Exam Simulation
```
[Dashboard (/dashboard)]
       │
       ▼
[Mock Setup & Rules (/mock)]
  • Displays Candidate's 4 Subjects (English + 3 Electives)
  • Rule Briefing: 180 questions, 120 minutes, 8-key keyboard guide
  • Button: "Start Examination"
       │
       ▼
[Focused CBT Screen (/mock/[attemptId])]
  • Distraction-free layout (Sidebar & headers removed)
  • Server-authoritative timer counting down (120:00)
  • Top Bar: Subject Tabs (English 1–60, Math 1–40, Phy 1–40, Chem 1–40)
  • Left Pane: Question Stem, Diagrams, Options A–D
  • Right Pane (Desktop) / Bottom Drawer (Mobile):
      └── Question Grid (Colored: Green=Answered, Gray=Unanswered, Amber=Flagged)
  • Autosave: Every click saves to localStorage + background server sync
  • Keyboard: Desktop users can use A, B, C, D, P, N, S, R hotkeys
       │
       ▼
[Submission Modal]
  • Triggered manually via "Submit" (or S key) OR automatically when timer reaches 00:00
  • Summary Dialog: "You answered 168/180 questions. Are you sure you want to finish?"
  • Confirmed Submit ──> Triggers Server Grading
       │
       ▼
[Diagnostic Results Page (/results/[attemptId])]
```

---

### Journey 4: Diagnostic Feedback & Revision Action Loop
```
[Results Page (/results/[attemptId])]
       │
       ├── Top Hero Card: Overall Score out of 400 (e.g. 214/400) vs Target (280/400)
       ├── 4 Subject Breakdown Cards:
       │     • Use of English: 58/100
       │     • Mathematics: 62/100
       │     • Physics: 38/100  <-- Flagged Weak Subject
       │     • Chemistry: 56/100
       │
       ├── Weak Topic Heatmap:
       │     • "Physics: Heat & Thermodynamics — Accuracy: 25%"
       │     • Direct Action Button: "Drill Thermodynamics (20 Qs) Now"
       │
       └── Question-by-Question Review:
             • Premium Users: Full access to all 180 questions with explanations
             • Free Users: Locked preview with "Upgrade to Unlock Full Solutions"
```

---

### Journey 5: Paystack Checkout & Entitlement Flow
```
[Paywall Prompt or /pricing]
       │
       ▼
[Checkout Confirmation (/checkout)]
  • Plan: JAMBPrep Premium (30-Day Access Pass)
  • Discount Check:
      ├── If student unlocked Referral Reward:
      │     └── "Referral Discount Applied: -50% (₦500 off)" ──> Total: ₦500
      └── Otherwise:
            └── Standard Price ──> Total: ₦1,000
  • Benefits Checklist (Unlimited Mocks, Explanations, Weak-Topic Drills)
  • Button: "Pay with Paystack"
       │
       ▼
[Paystack Standard Checkout Modal]
  • Channels: Card, Bank Transfer, USSD, OPay
  • User completes payment
       │
       ▼
[Server Webhook Processing]
  • `/api/webhooks/paystack` validates HMAC signature
  • Inserts transaction and extends `subscription_entitlements` +30 days
  • If referral discount used: marks `referral_rewards` as 'redeemed'
       │
       ▼
[Success Redirect]
  • Instant badge update to "Premium Member"
  • All mock limits and explanation gates unlocked
```

---

### Journey 6: The Refer-and-Earn Viral Loop ("Invite 2, Get 50% Off")
```
[Dashboard (/dashboard) or Nav Link]
       │
       ▼
[Referrals Center (/referrals)]
  • Hero Card: "Invite 2 Friends. Get 50% Off Your First Month."
  • Progress Counter: "[ 1 / 2 ] Verified Friends Registered"
  • Copyable Link: `jambprep.ng/r/TOBI99` (with 1-click WhatsApp share button)
       │
       ▼
[Friend Opens Link (/r/TOBI99)]
  • Lands on Registration with `ref=TOBI99` pre-filled & locked
  • Friend signs up and verifies email/phone
       │
       ▼
[Attribution & Reward Issuance]
  • System creates qualified entry in `referrals`
  • When qualified count hits 2:
      ├── Referrer receives in-app banner: "🎉 Reward Unlocked! You've earned 50% off!"
      └── `referral_rewards` record created with status 'available'
  • Next visit to `/checkout` automatically applies ₦500 first-month pricing
```

---

## 3. Responsive Navigation Layouts

### 3.1 Mobile Viewport (`< 768px`)
* **Standard App Pages**:
  * Top App Bar: Brand Logo, Daily Practice Quota pill (`12/15`), Profile Avatar.
  * Bottom Navigation Bar:
    1. **Home** (Dashboard)
    2. **Practice** (Topic drill)
    3. **Mock Exam** (CBT simulation)
    4. **Analytics** (Performance tracking)
    5. **More** (Bookmarks, Settings, Subscription)
* **Active CBT Exam Screen**:
  * Top Bar: Subject Selector Carousel + Sticky Countdown Timer Pill.
  * Middle: Scrollable Question stem, KaTeX formulas, diagram image, and stacked radio option cards.
  * Sticky Bottom Action Bar:
    * `Prev` Button
    * `Flag` Button (amber toggle)
    * `Question Palette` Trigger (opens bottom sheet with 1–40 grid)
    * `Next` Button
  * Top-right subtle "Submit Exam" button with two-step confirmation.

### 3.2 Desktop Viewport (`≥ 1024px`)
* **Standard App Pages**:
  * Collapsible Left Sidebar (260px): Brand Logo, Navigation items with Lucide icons, Target Score widget, User Profile dropdown.
  * Main Content Area: Centered container with max-width `1200px`.
* **Active CBT Exam Screen (Focused Mode)**:
  * Sidebar completely hidden; browser header minified to eliminate distractions.
  * Two-column split layout:
    * **Left Column (65%)**: Current Subject Banner, Question numbering, Question Stem, Options A–D, and Bottom Action Bar (Prev, Next, Flag, Submit).
    * **Right Column (35%)**: Large Live Timer, Subject switching tabs, Calculator quick-toggle, and Full Interactive Question Palette Grid (1–40 buttons with live status color codes).
