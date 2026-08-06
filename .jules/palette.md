## 2024-08-06 - Accessible Icon-only Buttons
**Learning:** Several action buttons in the UI were missing both visible tooltips (`title`) and accessible names (`aria-label`) for screen readers. Since they only visually display an icon, they were entirely inaccessible to keyboard and assistive technology users.
**Action:** When adding new icon-only buttons, always ensure that they have a descriptive `title` attribute for mouse users and an `aria-label` for screen reader users.
