## 2024-05-20 - Adding ARIA labels to Icon-only Buttons
**Learning:** React elements displaying raw material icons (like `{consts.START_MARK}`) within buttons can be completely ignored by screen readers, making the application inaccessible to keyboard and screen reader users. The `btn-icon` instances often lack textual representation.
**Action:** When adding or updating icon-only buttons (`btn-icon`), always ensure they are paired with `aria-label` and `title` attributes that meaningfully describe the button's action.
