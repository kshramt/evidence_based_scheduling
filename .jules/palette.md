## 2024-05-23 - [Icon-Only Buttons Missing Labels]
**Learning:** Many icon-only buttons (Start, Stop, Move Up/Down, etc.) in the application rely solely on visual icons (Material Icons) without accessible text alternatives. This makes them unusable for screen reader users and confusing for sighted users who don't recognize the icons.
**Action:** Always ensure icon-only buttons have both `aria-label` (for screen readers) and `title` (for tooltips) attributes describing the action.
