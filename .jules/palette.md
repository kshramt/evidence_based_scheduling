## 2024-04-11 - Adding ARIA labels to icon-only buttons
**Learning:** Found that some primary action buttons (like Add and Start) were missing accessible names, rendering them silent for screen reader users, despite visually communicating intent via icons.
**Action:** Always ensure icon-only buttons (`<button className="btn-icon">`) include `aria-label` (for screen readers) and `title` (for mouse hover tooltips).
