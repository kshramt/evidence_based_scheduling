## 2024-05-24 - Icon Constants Accessibility Pattern
**Learning:** Icon constants in `client/src/consts.tsx` (e.g., `DELETE_MARK`) are implemented as `span` elements with Material Icon ligatures. They do not include accessible text.
**Action:** Always add explicit `aria-label` and `title` attributes to any button consuming these constants to ensuring screen reader accessibility.
