## 2026-01-18 - Virtualized List Performance
**Learning:** Components rendered by `react-virtuoso` (like `QueueEntry`) MUST be wrapped in `React.memo` to prevent parent-triggered re-renders. `babel-plugin-react-compiler` does not seem to cover this case automatically when the component is passed as a render prop.
**Action:** Always wrap `itemContent` components in `React.memo` when using `react-virtuoso`.
