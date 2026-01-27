## 2024-01-27 - React Virtuoso and Memoization
**Learning:** Components rendered by `react-virtuoso` (like `QueueEntry`) must be explicitly wrapped in `React.memo`. Even with `react-compiler` or other optimizations, the parent-triggered re-renders from the virtualization library can cause performance issues if items are not memoized.
**Action:** Always wrap `itemContent` components in `React.memo` when using `react-virtuoso`.
