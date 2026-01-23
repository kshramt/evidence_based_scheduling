## 2026-01-23 - [React.memo and react-virtuoso]
**Learning:** Components rendered by `react-virtuoso` (like `QueueEntry`) must be explicitly wrapped in `React.memo` to prevent parent-triggered re-renders, even if `react-compiler` is used, as the library relies on it.
**Action:** Ensure list items in virtualized lists are memoized.
