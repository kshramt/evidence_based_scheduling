## 2024-06-07 - React Virtuoso List Item Re-renders
**Learning:** List item components in virtualized lists (like `react-virtuoso` or simple mapped arrays) that receive primitive props like `node_id` and `index` can suffer from severe O(N) re-renders when the list state updates or scrolls, causing significant jank, especially in complex components containing inputs and buttons.
**Action:** Always wrap these list item components (`QueueEntry`, `EdgeRow`, `MobileQueueNode`, `TreeEntry`) with `React.memo()` to prevent unnecessary re-renders when their specific props haven't changed.
