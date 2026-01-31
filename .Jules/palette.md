## 2024-05-22 - Icon-Only Button Accessibility
**Learning:** Many interactive elements in the codebase are icon-only buttons (using Material Icons) that lack `aria-label` or `title` attributes, making them inaccessible to screen readers and unclear to some users.
**Action:** When touching UI components, verify that icon-only buttons have descriptive `aria-label` attributes. Prioritize creating reusable components (like `AddButton`) that enforce or facilitate these attributes over inline button definitions.
