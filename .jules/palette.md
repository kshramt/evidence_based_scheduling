## 2024-05-13 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Found multiple icon-only buttons with the class `btn-icon` missing ARIA labels and title attributes, reducing accessibility. The parent `<span>` containing the `material-icons` must have `aria-hidden="true"` and the button itself needs a descriptive `aria-label`.
**Action:** Adding `aria-hidden="true"` to the `material-icons` elements in `client/src/consts.tsx` and updating the icon button components to include `aria-label` and `title` props.
