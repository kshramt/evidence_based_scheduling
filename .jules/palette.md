## 2024-05-18 - Material Icon Ligature Accessibility
**Learning:** Screen readers will incorrectly announce the inner ligature text (e.g. "play arrow") of `<span className="material-icons">` elements if they are not explicitly hidden. The button parent itself needs the label.
**Action:** Always add `aria-hidden="true"` to Material Icon span elements. If they are the sole content of an interactive element like a `<button>`, give the parent element a descriptive `aria-label` or `title`.
