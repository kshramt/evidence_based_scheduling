## 2024-06-11 - Adding ARIA labels to icon-only buttons
**Learning:** Found an accessibility pattern where icon-only buttons throughout the app (using the `btn-icon` class) rely solely on Material UI icons for meaning, making them invisible to screen readers.
**Action:** Always add descriptive `aria-label` attributes when creating or modifying icon-only buttons to ensure they remain accessible to visually impaired users navigating via keyboard or screen reader.
