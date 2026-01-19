## 2024-05-22 - Explicit React.memo for Virtuoso
**Learning:** `react-virtuoso` requires explicit `React.memo` on item components to effectively prevent parent-triggered re-renders during scrolling, even if `babel-plugin-react-compiler` is used.
**Action:** Always wrap components used in `itemContent` of `Virtuoso` with `React.memo`.
