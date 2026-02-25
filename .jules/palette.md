## 2026-02-25 - Icon-Only Button Accessibility and Typo Correction
**Learning:** The application heavily relies on icon-only buttons using the `btn-icon` class. Many of these buttons lacked `aria-label` and `title` attributes, severely impacting accessibility and usability. A recurring typo `icon-icon` was also discovered, which likely broke styling for affected buttons.
**Action:** Always verify that icon-only buttons include descriptive `aria-label` and `title` attributes. When reviewing code, specifically check for the correct `btn-icon` class name to avoid styling regressions.
