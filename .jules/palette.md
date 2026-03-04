## 2025-03-04 - Clear Buttons and Inputs Accessibility
**Learning:** Icon-only clear buttons (`icon-icon` and `btn-icon`) for filter inputs lack screen reader context, and inputs lack placeholders. The `icon-icon` class is inconsistent.
**Action:** Always provide `placeholder` and `aria-label` for text inputs, use `btn-icon` for icon buttons, and add `aria-label` and `title` to clear buttons.
