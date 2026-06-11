## 2024-06-11 - Virtuoso List Render Performance
**Learning:** List item components in virtualized lists (like `react-virtuoso`'s Queue and Mobile Queue components) receive primitive props but are not wrapped in `React.memo()`. This leads to unnecessary O(N) re-renders when list items are scrolled or their siblings change state.
**Action:** Always wrap components rendered in `react-virtuoso` or other virtualized lists in `React.memo` if they only depend on primitive props like `node_id` and `index`.
