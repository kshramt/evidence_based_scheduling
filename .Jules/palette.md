## 2026-01-28 - Missing ARIA Labels on Icon-only Buttons
**Learning:** The codebase heavily utilizes icon-only buttons for core actions (add, start, stop, etc.) without accompanying text labels or ARIA attributes. This renders the application largely unusable for screen reader users and confusing for users who may not understand the icons (as there are no tooltips).
**Action:** When creating or modifying icon-only buttons, always enforce the presence of `aria-label` and `title` attributes. This pattern should be checked during code review.
