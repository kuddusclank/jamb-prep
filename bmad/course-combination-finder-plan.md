# JAMB Course → Subject Combination Finder & Registration Funnel

Date: 24 October 2026. Status: approved planning specification. Related task breakdown: [`course-combination-finder-tasklist.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-finder-tasklist.md).

---

## 1. Product Vision & Confirmed Requirements

### 1.1 Problem & Opportunity
First-time UTME candidates frequently struggle to determine which 4 JAMB subjects are required for their intended university, polytechnic, or college degree course—or accidentally register wrong elective combinations that disqualify them during post-UTME screening. At the same time, *"JAMB subject combination for [Course]"* is one of the highest-volume organic search queries among Nigerian secondary school leavers.

By providing an instant, authoritative **JAMB Course → Subject Combination Finder**, JAMBPrep solves this pain point at the exact moment of decision and turns course lookup into a high-intent **registration and onboarding funnel**.

### 1.2 Confirmed Requirements (User-Specified — 24 October 2026)
1. **Dedicated `/combinations` Route (SEO & Public Discovery)**:
   - Publicly accessible without login so organic search visitors and prospective candidates can type in their course and immediately view their required UTME subject combination.
   - Indexed in `public/sitemap.xml` and permitted in `public/robots.txt` with rich metadata and structured JSON-LD schema.
2. **Core + Flexible Electives Domain Model**:
   - **Use of English (`ENG`)** is permanently locked as Subject 1 for every course.
   - **Mandatory Core Electives** (1 to 3 subjects depending on the course, e.g., `Biology`, `Chemistry`, `Physics` for *Medicine & Surgery*; or `Mathematics`, `Physics` for *Computer Science*) are automatically locked.
   - **Flexible Elective Slot(s)**: Where official JAMB IBASS brochure rules permit a choice (e.g., *"any one of Chemistry, Biology, Economics, Geography, Agricultural Science"* for *Computer Science*, or *"Literature in English plus any two Arts/Social Science subjects"* for *Law*), the UI locks the mandatory subject(s) and lets the student interactively click to choose from the approved options for the remaining slot(s) until all 4 subjects are complete.
3. **10-Second Smart Prompt on Landing Page (`/`)**:
   - After a guest has been on the landing page (`/`) for **10 seconds** without interacting with the course search or dismissing the prompt in the current session, a clean, non-intrusive dialog appears:
     - *"Don't know your JAMB subject combination? Click below to find out the exact subjects for your course."*
     - Primary button takes the student to `/combinations` (or focuses the course combination finder); dismissal is persisted in `sessionStorage` so it never nags repeatedly.
4. **Inline Course Combination Hook on Landing Page (`/#subjects`)**:
   - Replaces the dead-end preview widget on the landing page with an interactive Course Search box + quick-pick popular course pills where students can type their course, see their 4-subject combination + recommended target score, and click **"Lock In Course & Start Registration →"** to flow directly into `/register`.
5. **Registration & Onboarding Round-Trip (`?from=onboarding` / `?from=register`)**:
   - Students who are already on `/onboarding` (selecting their 4 subjects and course during registration) or `/register` see a clear callout label/link:
     - *"Not sure which subjects your course requires? Go to the Combination Finder to lock in your course and continue registration →"* (`/combinations?from=onboarding`).
   - When the student visits `/combinations?from=onboarding`, searches their course, completes any flexible slot, and clicks **"Lock In Course & Continue Registration →"**, their chosen course, 3 electives, and recommended target score are saved to local state (`jambprep_locked_combination_v1`) and they are returned directly to `/onboarding` with their 3 electives selected, target score set, and `targetCourse` pre-filled.
6. **Balanced Result Card Details**:
   - Displays the 4 UTME subjects (Compulsory + Core Electives + Flexible Slot picker), the **Recommended Competitive UTME Target Score** (e.g., `290–320+` for Medicine, `270–300+` for Law), a concise **Special Remark / Institution Waiver note** where critical, and the **One-Click "Lock In This Combination" CTA**.
7. **Preservation of Confirmed Access Boundary**:
   - Viewing course combinations is public; all practice questions, diagnostic mocks, and exams continue to require an authenticated account (`product-requirements.md`).

---

## 2. End-to-End User Journeys & Conversion Flows

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ENTRY PATH A: Organic Search / Direct Visit to /combinations                     │
│ ENTRY PATH B: Landing Page (/) 10-Second Dialog OR #subjects Inline Search Hook  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 1. Course Lookup & Slot Completion                                               │
│    • Student types course (e.g., "Nursing", "Comp Sci", "MBBS", "Law", "Mass")   │
│    • Sees locked Use of English + Core Electives                                 │
│    • Selects preferred subject(s) for any Flexible Elective Slot(s)              │
│    • Sees Recommended UTME Target Score (e.g., 280 / 400)                        │
│    • Clicks: "Lock In [Course] & Continue Registration →"                        │
│      (Saves `jambprep_locked_combination_v1` in localStorage)                    │
└───────────────────┬──────────────────────────────────────────┬───────────────────┘
                    │ If Guest                                 │ If Authenticated /
                    ▼                                          │ `?from=onboarding`
┌────────────────────────────────────────┐                     │
│ 2A. Registration Form (/register)      │                     │
│ • Displays top confirmation badge:     │                     │
│   "🎓 Course Locked In: Nursing        │                     │
│    (ENG, BIO, CHM, PHY · Target 280)"  │                     │
│ • Also provides a link for students    │                     │
│   who arrived at /register directly:   │                     │
│   "Don't know your combination?        │                     │
│    Find & lock in your course →"       │                     │
│ • On signup submit ──► /onboarding     │                     │
└───────────────────┬────────────────────┘                     │
                    └────────────────────┐                     │
                                         ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 3. Subject & Course Setup (/onboarding — `onboarding-wizard.tsx`)                │
│    • Reads `jambprep_locked_combination_v1` on mount                             │
│    • Auto-selects the 3 electives in Step 1 (`selectedElectives`)                │
│    • Auto-sets Step 2 Target UTME Score (`targetScore`)                          │
│    • Auto-fills Step 3 `targetCourse` input with the locked course title         │
│    • Restores any previously typed `targetInstitution` draft from sessionStorage │
│    • Shows green banner: "✓ Course Locked In: [Course Name]" + "Change course →" │
│    • If no course is locked yet, shows prominent callout banner & Step 3 label   │
│      linking to `/combinations?from=onboarding`                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Domain Model & Catalogue Architecture

### 3.1 Zero-Latency Static Client/Shared Catalogue
Because JAMBPrep uses a Next.js static export (`output: 'export'`) deployed to Cloudflare Pages with an offline-capable PWA Service Worker (`public/sw.js`), the JAMB IBASS course-to-subject dataset lives in a strongly typed module:
- **Path**: `src/lib/curriculum/jamb-course-combinations.ts`
- **Benefits**:
  - **0ms search & filtering** on both desktop and low-end mobile devices without network round-trips.
  - **Zero Cloudflare Worker CPU or database query overhead** (preserving Free-tier worker limits).
  - **100% offline availability** once the app shell is cached.

### 3.2 Canonical Subject Alignment
Every subject code in `jamb-course-combinations.ts` maps strictly to the **25 canonical database subjects** verified in `bmad/current-subject-blueprint-verification.json`:

| Code | Canonical Database Name (`subjects.name`) | Category |
| :--- | :--- | :--- |
| `ENG` | `Use of English` | Compulsory |
| `MTH` | `Mathematics` | Science / Quantitative |
| `PHY` | `Physics` | Science |
| `CHM` | `Chemistry` | Science |
| `BIO` | `Biology` | Science |
| `AGR` | `Agricultural Science` | Science / Vocational |
| `GEO` | `Geography` | Science / Social Science |
| `CMP` | `Computer Studies` | Science / Tech |
| `PHE` | `Physical and Health Education` | Science / Education |
| `HEC` | `Home Economics` | Vocational |
| `ECN` | `Economics` | Social Science / Commercial |
| `GOV` | `Government` | Social Science / Arts |
| `COM` | `Commerce` | Commercial |
| `ACC` | `Principles of Accounting` | Commercial |
| `LIT` | `Literature in English` | Arts / Humanities |
| `CRK` | `Christian Religious Knowledge` | Arts / Humanities |
| `IRS` | `Islamic Religious Studies` | Arts / Humanities |
| `HIS` | `History` | Arts / Humanities |
| `ARB` | `Arabic` | Arts / Languages |
| `ART` | `Art` | Arts / Creative |
| `FRN` | `French` | Arts / Languages |
| `HAU` | `Hausa` | Arts / Languages |
| `IGB` | `Igbo` | Arts / Languages |
| `MUS` | `Music` | Arts / Creative |
| `YOR` | `Yoruba` | Arts / Languages |

### 3.3 TypeScript Data Contracts

```ts
export type CourseFaculty =
  | 'Medical & Health Sciences'
  | 'Engineering & Technology'
  | 'Sciences & Computing'
  | 'Law'
  | 'Social Sciences'
  | 'Management & Commercial'
  | 'Arts & Humanities'
  | 'Agriculture & Environmental'
  | 'Education';

export interface FlexibleElectiveSlot {
  /** Label shown to the candidate, e.g. "Choose 1 additional Science subject" */
  slotLabel: string;
  /** Number of subjects the candidate must pick from `allowedCodes` (1, 2, or 3) */
  pickCount: 1 | 2 | 3;
  /** Canonical subject codes valid for this slot in priority order */
  allowedCodes: string[];
  /** Default pre-selected code(s) from `allowedCodes` so a valid 4-subject set is ready immediately */
  defaultCodes: string[];
}

export interface JambCourseCombination {
  /** URL-safe slug, e.g. 'medicine-and-surgery', 'computer-science', 'law' */
  id: string;
  /** Official display title, e.g. 'Medicine and Surgery' */
  title: string;
  /** Faculty grouping for filter tabs */
  faculty: CourseFaculty;
  /** Search keywords, abbreviations, and common Nigerian student slang (e.g. ['mbbs', 'med', 'doctor']) */
  aliases: string[];
  /** Compulsory subject code — always 'ENG' */
  compulsoryCode: 'ENG';
  /** Fixed mandatory elective subject codes (0 to 3 items) */
  coreElectiveCodes: string[];
  /** Optional flexible elective slot if `coreElectiveCodes.length < 3` */
  flexibleSlot?: FlexibleElectiveSlot;
  /** Recommended competitive UTME target score (multiple of 5 between 180 and 320) */
  recommendedTargetScore: number;
  /** Target score range label shown on the card, e.g. '290 – 330+' */
  competitiveScoreRange: string;
  /** Concise IBASS remark or key institutional note */
  ibassNote: string;
  /** Whether to highlight as a popular quick-pick course */
  isPopular?: boolean;
}
```

### 3.4 Locked Combination Storage Contract (`src/lib/curriculum/locked-combination-storage.ts`)
To coordinate state cleanly across `/`, `/combinations`, `/register`, and `/onboarding`:
- **Storage Key**: `jambprep_locked_combination_v1` in `localStorage`
- **Draft Onboarding Key**: `jambprep_onboarding_draft_v1` in `sessionStorage` (preserves `targetInstitution` and manual edits when a user hops from `/onboarding` to `/combinations?from=onboarding` and back).
- **Payload Schema**:
  ```ts
  export interface LockedCourseCombination {
    courseId: string;
    courseTitle: string;
    faculty: CourseFaculty;
    /** Exactly 3 canonical subject names matching `subjects.name` in DB */
    electiveNames: [string, string, string];
    /** Exactly 3 canonical subject codes matching `subjects.code` in DB */
    electiveCodes: [string, string, string];
    recommendedTargetScore: number;
    competitiveScoreRange: string;
    lockedAt: number;
  }
  ```
- **Validation & Safety**:
  - Rejects malformed JSON, expired payloads (>7 days old), or duplicate subject codes.
  - When applied in `onboarding-wizard.tsx`, filters against `catalog.availableSubjects` so that if a local test DB only has a subset of subjects seeded, it gracefully selects all matching available subjects without throwing errors.
  - Registered in `registerPrivateCacheClearer` (`src/lib/auth/storage-cleanup.ts`) so signing out or switching accounts clears any stale locked combination.

---

## 4. Component & Page Specifications

### 4.1 Dedicated `/combinations` Page (`src/app/combinations/page.tsx` & `combinations-client.tsx`)
- **Header & Context Bar**:
  - Standard JAMBPrep header with navigation back to `/`, `/register`, or `/dashboard`.
  - When `?from=onboarding` or `?from=register` is present: displays a prominent sticky top banner:
    - **"Registration Setup Mode — Select your course below to lock in your 4 UTME subjects and return to your registration."** with a **"← Back to Registration"** link.
- **Interactive Search & Faculty Filter Bar**:
  - Instant search input with clear button, matching `title`, `aliases`, `faculty`, and subject names.
  - Horizontal scrollable Faculty filter pills (`All Courses`, `Popular`, `Medical & Health Sciences`, `Engineering & Technology`, `Sciences & Computing`, `Law`, `Social Sciences`, `Management & Commercial`, `Arts & Humanities`, `Agriculture & Environmental`, `Education`).
- **Interactive Course Combination Cards**:
  - **Card Header**: Course Title, Faculty badge, and Competitive Score Range badge (e.g., `Target: 280–310+`).
  - **4-Subject Visual Builder**:
    1. `Use of English` (`Compulsory · Locked`)
    2. Each `coreElectiveCode` (`Core Requirement · Locked`)
    3. If `flexibleSlot` exists: interactive pill selector labeled `Choose 1 (or 2) approved elective:` where clicking an allowed subject swaps it into the active 4-subject combination in real time.
  - **IBASS Guidance Note**: 1-sentence official guidance note (e.g., *"Requires Mathematics, Physics, and one of Chemistry, Biology, Agricultural Science, Economics, or Geography."*).
  - **Primary Action Button**:
    - If `from=onboarding`: **"Lock In [Course] & Continue Registration →"** (saves to `localStorage` and routes to `/onboarding`).
    - If `from=register`: **"Lock In [Course] & Return to Sign Up →"** (saves to `localStorage` and routes to `/register`).
    - If signed-in user visiting normally: **"Apply Combination to My Study Profile →"** (saves to `localStorage` and routes to `/onboarding?edit=1`).
    - If guest visiting normally: **"Lock In [Course] & Start Free Registration →"** (saves to `localStorage` and routes to `/register?course=[id]`).

### 4.2 Landing Page 10-Second Smart Dialog & Inline Hook (`src/app/landing-interactions.tsx` & `src/app/page.tsx`)
- **10-Second Smart Prompt (`CombinationPromptDialog`)**:
  - Mounted on `/` for unauthenticated visitors.
  - Starts a 10,000ms timer on mount. Cancels automatically if:
    - The user has already dismissed it in `sessionStorage` (`jambprep_combo_prompt_dismissed_v1`), OR
    - The user already has a locked combination in `localStorage`, OR
    - The user has already typed into the inline `#subjects` course search box.
  - Renders an accessible dialog/card (`role="dialog"`, `Escape` to close, backdrop click to dismiss) with:
    - Headline: **"Don't know your JAMB subject combination?"**
    - Body: *"Type your dream course to see your official 4 UTME subjects, flexible elective options, and target score in seconds."*
    - Primary CTA: **"Find My Course Combination →"** (navigates to `/combinations`).
    - Secondary CTA: **"I already know my subjects"** (dismisses and records in `sessionStorage`).
- **Upgraded Landing Page `#subjects` Section (`SubjectPicker` in `src/app/landing-interactions.tsx`)**:
  - Adds a **Course Search Input + Quick Course Pills** (*Medicine & Surgery*, *Computer Science*, *Law*, *Nursing Science*, *Accounting*, *Mass Communication*, *Civil Engineering*, *Economics*) directly above the subject cards, plus a **"Browse all 100+ courses →"** link to `/combinations`.
  - Selecting or searching a course highlights its 4 required subjects, allows toggling any flexible elective slot, displays the recommended target score, and reveals the registration conversion CTA:
    - **"Lock In [Course] & Create Free Account →"** (saves `jambprep_locked_combination_v1` and navigates to `/register?course=[id]`).

### 4.3 Registration & Onboarding Integration (`src/app/register/register-form.tsx` & `src/app/onboarding/onboarding-wizard.tsx`)
- **In `src/app/register/register-form.tsx`**:
  - If `jambprep_locked_combination_v1` exists in `localStorage`, displays a rich emerald card at the top of the registration form:
    - **"🎓 Course Combination Locked In: [Course Title]"**
    - Shows the 4 subjects (`Use of English`, + 3 electives) and Target Score (`280+`), with a **"Change course"** link to `/combinations?from=register`.
  - If no course is locked yet, displays a subtle helper prompt below the form header / above the submit area:
    - **"Not sure of your UTME subjects? [Find & lock in your course combination first →](/combinations?from=register)"**
- **In `src/app/onboarding/onboarding-wizard.tsx`**:
  - **Above Step 1 (`1. Select Your 4 Subjects`)**:
    - If a locked course combination is loaded from `localStorage`: shows a confirmation banner:
      - **"✓ Course Locked In: [Course Title]"** — *"We automatically selected your 3 required electives (`[E1, E2, E3]`) and recommended target score (`[Score]`)."* with a **"Change course combination →"** link to `/combinations?from=onboarding`.
    - If no course is locked yet: shows an actionable callout banner:
      - **"Don't know the right subjects for your course? [Search & lock in your course combination →](/combinations?from=onboarding)"**
  - **In Step 3 (`3. First Choice Institution & Course`)**:
    - Adds a clickable label link above/beside the `targetCourse` input: **"Check combination for your course →"** (`/combinations?from=onboarding`) and pre-fills `targetCourse` with the locked course title.
  - **Draft State Persistence**:
    - Clicking the link to `/combinations?from=onboarding` saves the current `targetInstitution`, `targetScore`, and `selectedElectives` to `sessionStorage` so nothing typed so far is lost on return.

---

## 5. SEO, Sitemap, Robots & PWA Caching Rules

1. **Public SEO & Sitemap (`public/sitemap.xml` & `public/robots.txt`)**:
   - Add `https://jambprep.lecterniq.com/combinations/` to `public/sitemap.xml` with `<changefreq>weekly</changefreq>` and `<priority>0.9</priority>`.
   - Ensure `/combinations/` is allowed in `public/robots.txt`.
   - Include descriptive `<title>`, `<meta name="description">`, OpenGraph tags, canonical URL (`https://jambprep.lecterniq.com/combinations/`), and `FAQPage` / `ItemList` JSON-LD structured data on `src/app/combinations/page.tsx`.
2. **Static Export & Routing (`tests/t05-static-export-routing.test.mjs`)**:
   - Verify `/combinations` exports cleanly to `out/combinations/index.html`.
   - Add `/combinations` to header/static-export routing assertions.
3. **Navigation Links**:
   - Add **"Course Combinations"** link to guest desktop navigation (`src/app/page.tsx`), mobile menu drawer (`src/app/landing-interactions.tsx`), and footer links so both users and search crawlers discover `/combinations` from every public page.
