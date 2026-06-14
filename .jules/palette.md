## 2024-06-14 - Improve Icon Button Accessibility
**Learning:** This app heavily relies on icon-only buttons for core features (e.g. Add, Start, Top, TodoToDone), but most lack `aria-label`s, causing screen readers to just read "button". Applying labels provides crucial accessibility context without altering visual design.
**Action:** When adding or modifying icon-only buttons (`btn-icon`), always ensure they have a descriptive `aria-label` associated with them so assistive tech can understand their purpose.
