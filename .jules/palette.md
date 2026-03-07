## 2024-03-24 - Add ARIA Labels and Titles to Icon-Only Buttons
**Learning:** Found multiple icon-only buttons (like `btn-icon`) used heavily across the application without accessible names or hover text, making them unreadable to screen readers and difficult to understand without context.
**Action:** When adding or updating icon-only buttons, always include `aria-label` for screen readers and `title` for hover tooltips.
