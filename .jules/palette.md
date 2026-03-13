## 2024-03-13 - Added ARIA labels and title tooltips to icon-only buttons
**Learning:** Found several icon-only buttons across components (StartButton, StopButton, EvalButton, EntryButtons, etc.) missing `aria-label` and `title`. Also, `material-icons` used in `consts.tsx` need `aria-hidden="true"` to stop screen readers from dictating the ligature (e.g., 'play arrow').
**Action:** When adding icon-only buttons in the future, always ensure both `aria-label` (for screen readers) and `title` (for mouse hover) are present, and the icon element itself is hidden from screen readers.
