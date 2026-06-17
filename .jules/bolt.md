## 2026-06-17 - Wrap list items in React.memo
**Learning:** List items like `QueueEntry`, `MobileQueueNode`, `TreeEntry`, and `EdgeRow` taking primitive props like `node_id` and `index` must be wrapped in `React.memo` to prevent unnecessary O(N) re-renders in virtualized lists or mapped arrays, while appending `displayName` for React DevTools.
**Action:** Always check if list components are memoized, and if not, wrap them in `React.memo` with a `displayName`.
