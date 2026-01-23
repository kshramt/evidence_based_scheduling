## 2026-01-23 - Icon-Only Button Accessibility
**Learning:** Icon-only buttons using just visual markers (like `consts.ADD_MARK`) are invisible to screen readers and lack tooltips for mouse users, creating a significant accessibility gap in this application.
**Action:** Always wrap icon content in a button with `aria-label` describing the action and `title` for tooltip feedback.
