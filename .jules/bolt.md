## 2024-06-10 - Missing React.memo for Virtualized List Components
**Learning:** Components rendered within `react-virtuoso` lists (like `QueueEntry`, `MobileQueueNode`, `TreeEntry`, `EdgeRow`) receive primitive props but are not wrapped in `React.memo`. This causes unnecessary O(N) re-renders during state updates and scrolling.
**Action:** When working on large virtualized or mapped lists in React, wrap the entry components in `React.memo` and set their `displayName`.
