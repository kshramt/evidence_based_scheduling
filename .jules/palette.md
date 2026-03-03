## 2024-05-24 - Missing ARIA Labels on Icon-Only Action Buttons
**Learning:** Many icon-only action buttons (like Start/StartConcurrent/Eval/etc) are missing `aria-label`s and `title`s, which is a significant accessibility and micro-UX issue for screen readers. Using the `btn-icon` class consistently makes these easy to find, but we need to ensure each one is actually labeled.
**Action:** When working on components rendering icon-only buttons (`.btn-icon`), proactively verify and add `aria-label` and `title` attributes if missing.
