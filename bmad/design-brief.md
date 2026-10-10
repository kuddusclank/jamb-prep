# Design Brief & UI Design System
# JAMBPrep — Visual Identity, Component Specifications & Ergonomics

> October 2026 update: [UI design and component guide](ui-design-and-component-guide.md) is the current landing-page design authority. It supersedes the typography and landing patterns below. Exam components below remain proposed; use at least 44px mobile hit targets and the newer reduced-motion guidance.

**Document Version:** 1.0.0  
**Status:** Approved Specification  

---

## 1. Brand Identity & Design Principles

* **Credible & Scholarly**: Feels like a premier national coaching academy, not a gamified arcade or an obsolete 2005 Windows utility.
* **Calm & High-Stamina**: Candidates spend 2 straight hours in active mock mode. The interface avoids eye strain, aggressive motion, and jarring high-contrast shifts.
* **Ergonomic & Touch-Optimized**: Designed for one-handed mobile phone usage, with generous touch targets ($44\text{px}+$ tap areas) and accessible keyboard controls on desktop.
* **Feedback with Dignity**: Incorrect answers provide clear, actionable instruction rather than punitive red warning screens.

---

## 2. Color System & Design Tokens

```
Palette Breakdown:
┌─────────────────┬───────────┬──────────────────────────────────────────┐
│ Token           │ Hex Code  │ Semantic Usage                           │
├─────────────────┼───────────┼──────────────────────────────────────────┤
│ Primary         │ #116149   │ Brand identity, primary CTAs, active nav │
│ Primary Dark    │ #092E28   │ Headings, primary containers, dark text  │
│ Canvas Neutral  │ #F6F8F5   │ App background, glare reduction          │
│ Card Surface    │ #FFFFFF   │ Elevated content cards, question panels  │
│ Accent Gold     │ #E7B85A   │ Target score badges, flagged questions   │
│ Success Green   │ #16A34A   │ Correct answers, completed test modules  │
│ Error Coral     │ #DC645E   │ Incorrect options, time expiration       │
│ Border Neutral  │ #E2E8F0   │ Subtle component dividers, option rings  │
│ Muted Text      │ #64748B   │ Secondary descriptions, metadata         │
└─────────────────┴───────────┴──────────────────────────────────────────┘
```

### Tailwind CSS v4 Theme Variables
```css
@theme {
  --color-brand-primary: #116149;
  --color-brand-dark: #092E28;
  --color-brand-canvas: #f6f8f5;
  --color-brand-accent: #e7b85a;
  --color-brand-success: #16a34a;
  --color-brand-error: #dc645e;
  
  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

---

## 3. Typography System

| Style | Font Family | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Heading** | Plus Jakarta Sans | 32px / 2.0rem | 700 Bold | 1.25 | Landing hero, Target score badge |
| **Page Title (H1)** | Plus Jakarta Sans | 24px / 1.5rem | 700 Bold | 1.3 | Dashboard headers, Result score |
| **Section Title (H2)**| Plus Jakarta Sans | 18px / 1.125rem | 600 Semi-bold| 1.4 | Subject tabs, Card headings |
| **Question Stem** | Inter | 16px / 1.0rem | 500 Medium | 1.6 | Exam question text |
| **Option Text** | Inter | 15px / 0.9375rem| 400 Regular | 1.5 | Choices A, B, C, D |
| **Caption / Meta** | Inter | 13px / 0.8125rem| 400 Regular | 1.4 | Timers, difficulty pills, years |
| **Math / Formulas** | KaTeX Serif Engine | Auto-scaled | Regular | 1.5 | In-line & block scientific math |

---

## 4. Component Design Specifications

### 4.1 Option Selection Cards (A, B, C, D)
* **Default State**: White surface, 1.5px solid `#E2E8F0` border, rounded-xl (`12px`), 16px padding.
* **Hover State**: Light emerald tint (`bg-emerald-50/50`), border `#116149/40`.
* **Selected State (Active Exam)**: Border 2px solid `#116149`, background `#116149/5`, with a filled emerald indicator circle.
* **Review Mode (Correct)**: Border 2px solid `#16A34A`, background `#16A34A/10`, with green checkmark icon.
* **Review Mode (Incorrect Choice)**: Border 2px solid `#DC645E`, background `#DC645E/10`, with red X icon.

### 4.2 The Question Palette Grid (1–40 Buttons)
Buttons are rendered as $36\text{px} \times 36\text{px}$ rounded squares with center-aligned numbers:
1. **Unanswered**: Gray background (`#F1F5F9`), dark text (`#334155`), border `#E2E8F0`.
2. **Answered**: Solid emerald background (`#116149`), white text (`#FFFFFF`).
3. **Flagged for Review**: Amber background (`#FEF3C7`), amber text (`#D97706`), with an amber top-right indicator dot.
4. **Current Active Question**: High-contrast dark ring (`ring-2 ring-[#092E28] ring-offset-2`).

### 4.3 Countdown Timer Component
* **Standard State**: Pill badge with clock icon, background `#F1F5F9`, text `#092E28`, monospace tabular figures (`font-mono`).
* **Warning State ($< 15\text{ minutes remaining}$)**: Background `#FEF3C7`, text `#B45309`, gentle amber pulse.
* **Critical State ($< 5\text{ minutes remaining}$)**: Background `#FEE2E2`, text `#B91C1C`, animated red pulse border.

### 4.4 Topic Weakness Cards (Diagnostic UI)
* Card displaying Topic Name, Subject pill, and an accuracy meter:
  * Red bar ($< 40\%$): *"Critical Revision Needed"*
  * Amber bar ($40\% - 69\%$): *"Moderate Mastery"*
  * Emerald bar ($\ge 70\%$): *"Exam Ready"*
* Action Button embedded on card: *"Drill 15 Practice Questions $\rightarrow$"*.

---

## 5. Accessibility & Ergonomics Standards

* **Accessible Color Contrast**: All text pairings maintain a minimum contrast ratio of **4.5:1** against backgrounds (meeting WCAG 2.1 AA).
* **Multi-Modal Indicators**: Statuses never rely solely on color. Every green indicator includes a checkmark icon or "Correct" text; every red indicator includes an X icon or "Incorrect" text.
* **Keyboard Hotkey Overlay**: On desktop CBT mode, small keycaps (`[A]`, `[B]`, `[C]`, `[D]`, `[P]`, `[N]`, `[S]`, `[R]`) are visible next to corresponding actions to guide muscle memory.
