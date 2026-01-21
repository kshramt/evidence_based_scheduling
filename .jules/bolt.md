## 2026-01-21 - [Optimizing Virtualized Lists]
**Learning:** `react-virtuoso` components (like `QueueEntry`) MUST be wrapped in `React.memo` to effectively prevent re-renders when the list parent updates, even if using `babel-plugin-react-compiler`. This is because `Virtuoso` manages item rendering in a way that can bypass automatic compiler optimizations if props equality isn't explicitly enforced.
**Action:** Always wrap `itemContent` components in `React.memo` when using `react-virtuoso`.
