## 2024-05-05 - Material UI Icon Ligatures and Screen Readers
**Learning:** Material UI icon spans (e.g., `<span className="material-icons">`) use text ligatures (e.g., "play_arrow") to render icons. Screen readers will incorrectly announce this ligature text (e.g., reading "play underscore arrow" instead of the button's action) unless the span has `aria-hidden="true"`.
**Action:** Always add `aria-hidden="true"` to Material UI icon spans, and ensure the parent interactive element (like a button) has a descriptive `aria-label` or `title`.
