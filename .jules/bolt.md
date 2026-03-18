## 2024-05-24 - React.memo on Virtualized List Items
**Learning:** The application heavily utilizes `react-virtuoso` and large mapped arrays (like queues) which receive primitive props such as `node_id` and `index`. Omitting `React.memo` on these list item components (`QueueEntry`, `MobileQueueNode`) causes expensive O(N) re-renders across the entire list during scroll events and state updates in `useSelector`.
**Action:** Always wrap list item components receiving primitive props in `React.memo`, especially when they are rendered inside virtualized lists or large mapped arrays.
