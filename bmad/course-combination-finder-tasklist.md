# JAMB Course → Subject Combination Finder Tasklist

Date: 25 October 2026. Status: completed (`C00`–`C07`). Authoritative specification: [`course-combination-finder-plan.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-finder-plan.md).

---

## Task Summary Matrix

| Status | ID | Phase / Bounded Task | Dependencies | Target Files |
| :--- | :--- | :--- | :--- | :--- |
| [x] | **C00** | Curated JAMB IBASS Course Combination Catalogue & Fuzzy Search Engine | None | `src/lib/curriculum/jamb-course-combinations.ts` |
| [x] | **C01** | Locked Combination Storage & Cross-Route State Coordinator | C00 | `src/lib/curriculum/locked-combination-storage.ts`, `src/lib/auth/storage-cleanup.ts` |
| [x] | **C02** | Dedicated `/combinations` Public SEO Page & Interactive Slot Builder | C00, C01 | `src/app/combinations/page.tsx`, `src/app/combinations/combinations-client.tsx` |
| [x] | **C03** | Landing Page 10-Second Smart Prompt Dialog & Inline `#subjects` Hook | C00, C01, C02 | `src/app/landing-interactions.tsx`, `src/app/page.tsx` |
| [x] | **C04** | Registration (`/register`) & Onboarding (`/onboarding`) Round-Trip Integration | C01, C02 | `src/app/register/register-form.tsx`, `src/app/onboarding/onboarding-wizard.tsx` |
| [x] | **C05** | SEO Sitemap, Robots.txt, JSON-LD Schema & PWA Shell Integration | C02 | `public/sitemap.xml`, `public/robots.txt`, `public/sw.js` |
| [x] | **C06** | Automated Unit & Static-Export Regression Test Suite | C00–C05 | `tests/course-combinations.test.mjs`, `tests/t05-static-export-routing.test.mjs`, `package.json` |
| [x] | **C07** | Build Verification, Typecheck & BMAD Evidence Recording | C06 | `bmad/course-combination-finder-tasklist.md`, `_bmad-output/implementation-artifacts/status.md` |

---

## C00 — Curated JAMB IBASS Course Combination Catalogue & Fuzzy Search Engine

- [x] Create `src/lib/curriculum/jamb-course-combinations.ts` exporting strongly typed `JambCourseCombination`, `FlexibleElectiveSlot`, and `CourseFaculty` interfaces.
- [x] Map every subject code (`ENG`, `MTH`, `PHY`, `CHM`, `BIO`, `ECN`, `GOV`, `LIT`, `COM`, `ACC`, `CRK`, `IRS`, `GEO`, `AGR`, `HIS`, `ARB`, `ART`, `CMP`, `FRN`, `HAU`, `HEC`, `IGB`, `MUS`, `PHE`, `YOR`) 1:1 to the exact 25 canonical database subject names in `bmad/current-subject-blueprint-verification.json` and `src/lib/curriculum/jamb-syllabus-data.ts`.
- [x] Populate **427 accredited Nigerian university/polytechnic/college courses** sourced from official JAMB IBASS brochure faculties across all 9 faculties:
  1. **Medical & Health Sciences (30 courses)**: *Medicine and Surgery (MBBS)*, *Nursing Science*, *Pharmacy*, *Doctor of Pharmacy (Pharm.D)*, *Medical Laboratory Science (MLS)*, *Dentistry*, *Physiotherapy*, *Medical Rehabilitation*, *Radiography*, *Optometry*, *Public Health*, *Environmental Health Science*, *Human Nutrition & Dietetics*, *Prosthetics & Orthotics*, *Audiology*, *Speech Therapy*, *Biomedical Technology*, *Dental Technology*, *Health Information Management*, *Human Anatomy*, *Human Physiology*, *Pharmacology*, *Veterinary Medicine*, *Midwifery*, etc.
  2. **Engineering & Technology (64 courses)**: *Computer Engineering*, *Civil Engineering*, *Mechanical Engineering*, *Electrical Engineering*, *Electronics Engineering*, *Electrical & Electronics Engineering*, *Chemical Engineering*, *Petroleum Engineering*, *Petroleum & Gas Engineering*, *Gas Engineering*, *Mechatronics Engineering*, *Aerospace/Aeronautical Engineering*, *Agricultural & Bio-Resources Engineering*, *Software Engineering*, *Marine Engineering*, *Metallurgical & Materials Engineering*, *Systems Engineering*, *Biomedical Engineering*, *Structural Engineering*, *Production & Industrial Engineering*, *Automotive Engineering*, *Telecommunications Engineering*, *Polymer & Textile Engineering*, *Food Engineering*, *Water Resources & Environmental Engineering*, *Mining Engineering*, *Wood Products Engineering*, *Architecture*, *Estate Management*, *Quantity Surveying*, *Urban & Regional Planning*, *Building Technology*, *Surveying & Geoinformatics*, *Industrial Design*, *Project Management Technology*, *Transport Management Technology*, *Maritime Management Technology*, etc.
  3. **Sciences & Computing (62 courses)**: *Computer Science*, *Cyber Security*, *Information Technology*, *Information Systems*, *Data Science*, *Library & Information Science*, *Microbiology*, *Industrial Microbiology*, *Biochemistry*, *Chemistry*, *Industrial Chemistry*, *Pure & Applied Chemistry*, *Petroleum Chemistry*, *Physics*, *Pure & Applied Physics*, *Industrial Physics*, *Geophysics*, *Electronics*, *Mathematics*, *Pure & Applied Mathematics*, *Industrial Mathematics*, *Statistics*, *Actuarial Science*, *Geology*, *Earth Sciences*, *Applied Geophysics*, *Meteorology & Climate Science*, *Biotechnology*, *Genetics & Biotechnology*, *Botany / Plant Science*, *Zoology*, *Cell Biology & Genetics*, *Marine Biology & Fisheries*, *Parasitology & Entomology*, *Ecology*, *Science Laboratory Technology (SLT)*, *Forensic Science*, etc.
  4. **Law (12 courses)**: *Common Law (LL.B)*, *Civil Law*, *Common and Islamic Law (Sharia Law)*, *Private & Islamic Law*, *Public & International Law*, *Commercial & Industrial Law*, *Jurisprudence & International Law*, *Criminology & Penology*, etc.
  5. **Social Sciences (48 courses)**: *Economics*, *Political Science*, *International Relations*, *Peace & Conflict Resolution*, *Mass Communication*, *Journalism & Media Studies*, *Broadcasting*, *Information & Media Studies*, *Psychology*, *Clinical Psychology*, *Sociology*, *Anthropology*, *Criminology & Security Studies*, *Intelligence & Security Studies*, *Geography*, *Geography & Environmental Management*, *Demography & Social Statistics*, *Public Administration*, *Local Government & Development Studies*, *Social Work*, *Tourism & Hospitality Management*, *Transport & Logistics Management*, etc.
  6. **Management & Commercial (45 courses)**: *Accounting / Accountancy*, *Business Administration*, *Business Management*, *Banking and Finance*, *Finance*, *Marketing*, *Insurance*, *Actuarial Science & Insurance*, *Entrepreneurship*, *Industrial Relations & Personnel Management*, *Human Resource Management*, *Taxation*, *Customs & Excise Management*, *Cooperative & Rural Development*, *Office & Information Management*, *Procurement & Supply Chain Management*, *Public Relations & Advertising*, *E-Commerce & Digital Business*, *Hospitality & Tourism*, etc.
  7. **Arts & Humanities (53 courses)**: *English Language*, *English & Literary Studies*, *Literature in English*, *Theatre Arts*, *Performing Arts*, *Dramatic Arts*, *Creative & Visual Arts*, *Fine & Applied Arts*, *Music*, *History*, *History & International Studies*, *History & Diplomatic Studies*, *Archaeology*, *Philosophy*, *Religious Studies*, *Christian Religious Studies*, *Theology*, *Islamic Studies*, *Arabic Studies*, *Arabic & Islamic Studies*, *Linguistics*, *Linguistics & Nigerian Languages*, *French*, *European Languages*, *Hausa*, *Igbo*, *Yoruba*, *Communication & Language Arts*, *Translation Studies*, etc.
  8. **Agriculture & Environmental (38 courses)**: *Agricultural Science*, *Agriculture*, *Agricultural Economics*, *Agricultural Extension & Rural Development*, *Agricultural Economics & Extension*, *Agronomy*, *Crop Production & Protection*, *Soil Science & Land Management*, *Animal Science*, *Animal Production & Health*, *Animal Nutrition*, *Animal Breeding & Genetics*, *Fisheries & Aquaculture*, *Forestry & Wildlife Management*, *Ecotourism & Wildlife Management*, *Food Science & Technology*, *Home Science & Management*, *Nutrition & Consumer Sciences*, *Water Resources Management & Agrometeorology*, *Horticultural Science*, *Plant Breeding & Seed Technology*, etc.
  9. **Education (75 courses)**: *Education & Biology*, *Education & Chemistry*, *Education & Physics*, *Education & Mathematics*, *Education & Computer Science*, *Education & Integrated Science*, *Education & Agricultural Science*, *Education & Geography*, *Education & Economics*, *Education & Political Science*, *Education & Social Studies*, *Education & Accountancy / Business Education*, *Secretarial Education*, *Education & English Language*, *Education & Literature in English*, *Education & French*, *Education & History*, *Education & Christian Religious Studies*, *Education & Islamic Studies*, *Education & Fine Art*, *Education & Music*, *Education & Hausa*, *Education & Igbo*, *Education & Yoruba*, *Guidance & Counselling*, *Educational Management & Administration*, *Educational Foundations*, *Curriculum & Instruction*, *Adult & Non-Formal Education*, *Early Childhood & Primary Education*, *Primary Education Studies*, *Special Needs Education*, *Human Kinetics & Health Education*, *Physical & Health Education*, *Home Economics & Education*, *Technical & Vocational Education*, *Library & Information Science (Education)*, *Environmental Education*, *Nursery & Primary Education*, etc.
- [x] Ensure every course defines:
  - `compulsoryCode: 'ENG'`
  - `coreElectiveCodes` (mandatory fixed electives)
  - `flexibleSlot` (when `coreElectiveCodes.length < 3`, specifying `pickCount`, `allowedCodes`, `defaultCodes`, and `slotLabel`)
  - `recommendedTargetScore` (multiple of 5 between `180` and `320`) and `competitiveScoreRange`
  - `aliases` (common Nigerian abbreviations, e.g., `mbbs`, `med`, `comp sci`, `csc`, `mls`, `pharm`, `pol sci`, `mass comm`, `elect elect`, `acct`, `bus admin`, `int relations`)
  - `ibassNote` (concise official requirement note)
- [x] Implement `searchCourseCombinations(query: string, faculty?: CourseFaculty | 'All' | 'Popular')` supporting case-insensitive prefix, substring, token, and alias ranking (exact title/alias match first, prefix match second, token/faculty match third).
- [x] Implement `resolveCourseElectives(course: JambCourseCombination, chosenFlexibleCodes?: string[])` returning a validated 3-elective array of `{ code, name, isCore }` plus `isComplete: boolean`.

**Acceptance**: Every course resolves to `ENG` + exactly 3 distinct valid database subjects by default; custom flexible choices are validated against `allowedCodes`; fuzzy search resolves common student slang (`"mbbs"`, `"comp sci"`, `"mass comm"`, `"law"`, `"nursing"`).

---

## C01 — Locked Combination Storage & Cross-Route State Coordinator

- [x] Create `src/lib/curriculum/locked-combination-storage.ts` managing:
  - `saveLockedCombination(input: LockedCourseCombination): void` (`localStorage` key `jambprep_locked_combination_v1`)
  - `getLockedCombination(): LockedCourseCombination | null` (validates schema, 3 distinct electives, non-expired 7-day TTL)
  - `clearLockedCombination(): void`
  - `saveOnboardingDraft(draft: { targetInstitution?: string; targetScore?: number; selectedElectives?: string[] }): void` (`sessionStorage` key `jambprep_onboarding_draft_v1`)
  - `getOnboardingDraft()` and `clearOnboardingDraft()`
- [x] Register `clearLockedCombination` and `clearOnboardingDraft` with `registerPrivateCacheClearer` in `src/lib/auth/storage-cleanup.ts` so logout or account switching cleans up stored combinations.

**Acceptance**: Saving, reading, expiring, and clearing locked combinations and onboarding drafts work deterministically across browser tabs/routes and are wiped on logout.

---

## C02 — Dedicated `/combinations` Public SEO Page & Interactive Slot Builder

- [x] Create `src/app/combinations/page.tsx` with server metadata (`title`, `description`, `alternates.canonical`, `openGraph`, `twitter`) and JSON-LD `FAQPage` + `ItemList` structured data.
- [x] Create `src/app/combinations/combinations-client.tsx` wrapped in `<BrowserAccountBoundary mode="public">`:
  - **Context-Aware Top Banner**:
    - Detects `?from=onboarding` or `?from=register` (and `?course=` initial query) via `useSearchParams()`.
    - Renders a prominent return bar when arriving from registration/onboarding: *"Registration Setup — Search your course below, pick any flexible subject, and lock it in to continue your registration"* + **"← Back to Registration"**.
  - **Search & Faculty Filter Controls**:
    - Instant search input with keyboard focus shortcut, clear button, and live result count.
    - Popular course quick-chips + Faculty filter tabs (`All`, `Popular`, and the 9 faculties).
  - **Interactive Course Combination Card**:
    - Displays Course Title, Faculty pill, and **Competitive Target Score** badge (`Target: 280–310+`).
    - Shows the 4 subject slots:
      1. `Use of English` (`Compulsory · Locked`)
      2. Mandatory core electives (`Core · Locked`)
      3. Interactive flexible slot selector (when `flexibleSlot` is present): allows clicking allowed subject pills to swap flexible elective choices while keeping total electives at 3.
    - Displays the `ibassNote` guidance remark.
    - **Primary Lock-In CTA**:
      - When `from=onboarding`: **"Lock In [Course] & Continue Registration →"** (saves to `localStorage` and navigates to `/onboarding`).
      - When `from=register`: **"Lock In [Course] & Return to Sign Up →"** (saves to `localStorage` and navigates to `/register`).
      - When authenticated user browsing normally: **"Use This Combination in My Profile →"** (saves to `localStorage` and navigates to `/onboarding?edit=1`).
      - When guest browsing normally: **"Lock In [Course] & Start Free Registration →"** (saves to `localStorage` and navigates to `/register?course=[course.id]`).

**Acceptance**: Guests and signed-in candidates can search any course, customize flexible elective slots, and lock in their combination with context-aware routing back to `/onboarding` or `/register`.

---

## C03 — Landing Page 10-Second Smart Prompt Dialog & Inline `#subjects` Hook

- [x] In `src/app/landing-interactions.tsx`:
  - Implement `CombinationPromptDialog`:
    - Starts a 10-second (`10,000ms`) timer on mount for guest visitors on `/`.
    - Suppresses automatically if `sessionStorage.getItem('jambprep_combo_prompt_dismissed_v1')` is set, if `getLockedCombination()` already exists, or if the user has already interacted with the inline course search on `/`.
    - Renders an accessible modal dialog (`role="dialog"`, `aria-modal="true"`, Escape key & backdrop dismissal):
      - Badge: `OFFICIAL JAMB IBASS BROCHURE GUIDE`
      - Heading: **"Don't know your JAMB subject combination?"**
      - Copy: *"Enter your dream course to get your official 4 UTME subjects and target score before you start practicing."*
      - Primary CTA: **"Find My Course Combination →"** (routes to `/combinations` and marks prompt seen).
      - Secondary button: **"I already know my subjects"** (dismisses and sets `sessionStorage`).
  - Upgrade `SubjectPicker` in `src/app/landing-interactions.tsx`:
    - Add an inline **Course Search Box + Quick-Pick Course Pills** (*Medicine & Surgery*, *Computer Science*, *Law*, *Nursing Science*, *Accounting*, *Mass Communication*, *Mechanical Engineering*, *Economics*) at the top of the `#subjects` section on `/`.
    - When a visitor types or selects a course, display the course's locked core electives, interactive flexible elective picker, recommended target score, and a primary conversion button:
      - **"Lock In [Course] & Start Registration →"** (calls `saveLockedCombination` and navigates to `/register?course=[id]`).
    - Retain the manual subject toggle fallback below/alongside and include a **"Explore all 80+ courses on the Combination Finder →"** link to `/combinations`.
- [x] In `src/app/page.tsx`:
  - Mount `<CombinationPromptDialog />`.
  - Add `"Combinations"` link (`/combinations`) to the desktop guest header nav, mobile menu drawer (`MobileMenu`), and footer.

**Acceptance**: After 10 seconds on `/`, unengaged guests see the non-intrusive prompt once per session; visitors using the `#subjects` course search can lock in their course and jump straight to `/register`.

---

## C04 — Registration (`/register`) & Onboarding (`/onboarding`) Round-Trip Integration

- [x] In `src/app/register/register-form.tsx`:
  - Read `getLockedCombination()` on mount.
  - **If a locked combination exists**: render an emerald confirmation card at the top of the form:
    - **"🎓 Course Locked In: [Course Title]"**
    - Lists `Use of English + [3 Electives]` and `Recommended Target: [Score]/400`.
    - Includes a **"Change course"** link to `/combinations?from=register`.
  - **If no locked combination exists**: render a helpful prompt box with a link to `/combinations?from=register`:
    - **"Don't know your UTME combination? [Find & lock in your course subjects first →](/combinations?from=register)"**
- [x] In `src/app/onboarding/onboarding-wizard.tsx`:
  - On mount (after `loadOnboarding()` resolves `catalog`), check `getOnboardingDraft()` and `getLockedCombination()`:
    - Restore `targetInstitution` draft if present.
    - If a locked combination exists (and the student doesn't already have saved subjects unless coming back from `/combinations` or `?edit=1`), match `locked.electiveNames` against `catalog.availableSubjects`, auto-populate `selectedElectives`, set `targetScore` to `locked.recommendedTargetScore`, and set `targetCourse` to `locked.courseTitle`.
  - **Above Step 1 (`1. Select Your 4 Subjects`)**:
    - When a course is locked: display an emerald banner showing **"✓ Course Locked In: [Course Title] (`English, E1, E2, E3`)"** with a **"Change course on Combination Finder →"** button (`/combinations?from=onboarding`).
    - When no course is locked: display a prominent callout card:
      - **"Not sure which subjects your course requires?"**
      - *"Visit the Course Combination Finder to look up your course, lock in your official 4 subjects, and continue your registration."*
      - Button: **"Find & Lock In My Course Combination →"** (saves current form draft via `saveOnboardingDraft` and navigates to `/combinations?from=onboarding`).
  - **In Step 3 (`3. First Choice Institution & Course`)**:
    - Add a label action next to the Course input (`"Select via Combination Finder →"`) that saves the current draft and navigates to `/combinations?from=onboarding`.
    - Controlled `targetCourse` and `targetInstitution` inputs so locked course titles and preserved drafts render immediately and submit cleanly in `saveOnboarding()`.
  - Clear `clearLockedCombination()` and `clearOnboardingDraft()` upon successful `saveOnboarding()` completion.

**Acceptance**: A student on `/onboarding` can click through to `/combinations?from=onboarding`, lock in a course, return to `/onboarding` with their 3 electives, target score, and `targetCourse` pre-filled (and any typed institution preserved), and complete registration.

---

## C05 — SEO Sitemap, Robots.txt, JSON-LD Schema & PWA Shell Integration

- [x] Update `public/sitemap.xml` to include `https://jambprep.lecterniq.com/combinations/` with `<changefreq>weekly</changefreq>` and `<priority>0.9</priority>`.
- [x] Verify `public/robots.txt` allows `/combinations/` (not listed in `Disallow`).
- [x] Update `public/sw.js` pre-cache / public shell route list if needed so `/combinations` works seamlessly offline in the installed PWA.

**Acceptance**: `/combinations/` is present in `public/sitemap.xml`, allowed by `public/robots.txt`, and renders clean static HTML in `out/combinations/index.html`.

---

## C06 — Automated Unit & Static-Export Regression Test Suite

- [x] Create `tests/course-combinations.test.mjs` testing:
  1. `JAMB_COURSE_COMBINATIONS.length >= 300` distinct courses across all 9 faculties, and all courses reference valid canonical subject codes and names from the 25 active JAMB subjects.
  2. Every course resolves to `Use of English` + 3 distinct default electives with no duplicates.
  3. Flexible elective slot resolution accepts valid `allowedCodes` and rejects invalid/duplicate codes.
  4. Fuzzy search (`searchCourseCombinations`) accurately matches exact names, partial queries, faculty filters, and Nigerian student aliases (`"mbbs"`, `"comp sci"`, `"mass comm"`, `"law"`, `"nursing"`, `"acct"`).
  5. `locked-combination-storage.ts` saves, retrieves, validates, expires stale entries, preserves onboarding drafts, and clears on logout.
- [x] Update `tests/t05-static-export-routing.test.mjs` to assert `/combinations` is statically exported (`out/combinations/index.html`).
- [x] Add `tests/course-combinations.test.mjs` to the `npm test` script in `package.json`.

**Acceptance**: All unit tests and static export routing assertions pass via `npm test`.

---

## C07 — Build Verification, Typecheck & BMAD Evidence Recording

- [x] Run `npx tsc --noEmit` in `jambprep/` and confirm 0 TypeScript errors.
- [x] Run `npm run build` (`next build --webpack && node scripts/build-pwa.mjs`) and confirm `/combinations` compiles cleanly as a static route.
- [x] Run unit & static routing tests and confirm all test suites pass.
- [x] Update task checkboxes and implementation evidence in `bmad/course-combination-finder-tasklist.md`, `bmad/README.md`, and `_bmad-output/implementation-artifacts/status.md`.

**Acceptance**: Zero TypeScript errors, clean static PWA build, 100% passing test suite, and complete BMAD documentation handoff.

- [ ] Add `tests/course-combinations.test.mjs` to the `npm test` script in `package.json`.

**Acceptance**: All unit tests and static export routing assertions pass via `npm test`.

---

## C07 — Build Verification, Typecheck & BMAD Evidence Recording

- [ ] Run `npx tsc --noEmit` in `jambprep/` and confirm 0 TypeScript errors.
- [ ] Run `npm run build` (`next build --webpack && node scripts/build-pwa.mjs`) and confirm `/combinations` compiles cleanly as a static route.
- [ ] Run `npm test` and confirm all test suites pass.
- [ ] Update task checkboxes and implementation evidence in `bmad/course-combination-finder-tasklist.md`, `bmad/README.md`, and `_bmad-output/implementation-artifacts/status.md`.

**Acceptance**: Zero TypeScript errors, clean static PWA build, 100% passing test suite, and complete BMAD documentation handoff.
