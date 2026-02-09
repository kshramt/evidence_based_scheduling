## 2024-05-23 - React.memo for Virtualized List Items
**Learning:** `react-virtuoso`'s `itemContent` prop requires the returned component to be explicitly wrapped in `React.memo` to prevent parent-triggered re-renders when other list items update or during virtualization passes, even when `babel-plugin-react-compiler` is in use.
**Action:** Always wrap `QueueEntry` or similar list item components in `React.memo`.
