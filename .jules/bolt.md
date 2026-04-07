## 2025-04-07 - Add React.memo to Queue Entries
**Learning:** Wrapping virtualized or long list item components (`QueueEntry`, `MobileQueueNode`) that receive primitive props (`node_id`, `index`, `nodeId`) in `React.memo` effectively prevents unnecessary O(N) re-renders during state updates or scrolling. This is specifically relevant for `react-virtuoso` lists in the frontend architecture.
**Action:** Always wrap frequently rendered list entry components with primitive props in `React.memo` to safeguard rendering performance.
