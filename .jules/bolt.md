## 2026-01-28 - [React Compiler & Virtuoso Interaction]
**Learning:** Components rendered by `react-virtuoso` (via `itemContent`) must be explicitly wrapped in `React.memo` to prevent parent-triggered re-renders. `babel-plugin-react-compiler` does not automatically optimize these components effectively in this context, leading to performance degradation in large lists.
**Action:** Always wrap `react-virtuoso` item components in `React.memo` manually.
