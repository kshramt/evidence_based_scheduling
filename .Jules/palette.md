## 2025-02-18 - Input and Icon-Only Button Accessibility
**Learning:** Many input fields (like filters) lacked labels and placeholders, and their associated "clear" buttons were icon-only without `aria-label`. This made them hard to discover and use for screen reader users.
**Action:** When creating or modifying inputs with icon-only controls, always add `aria-label` to the input (if a visible label isn't feasible) and `aria-label` + `title` to the buttons.
