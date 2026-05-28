## 2024-05-28 - Missing accessibility attributes for icon-only buttons
**Learning:** React components implementing icon-only buttons with the `btn-icon` class consistently lack `aria-label` and `title` attributes. This breaks accessibility for screen reader users and missing `title` degrades usability for sighted users.
**Action:** Always verify new or existing `btn-icon` components have descriptive `aria-label` and `title` attributes (e.g., `aria-label="Add new item" title="Add new item"`).
