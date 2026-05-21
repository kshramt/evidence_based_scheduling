## 2024-05-24 - React.memo usage
**Learning:** Found multiple places where components receiving primitive props and inside large mapping contexts like QueueEntry, EdgeRow, TreeEntry, and MobileQueueNode could benefit from `React.memo`. The `QueueEntry` is within `react-virtuoso`, so memoizing these saves an enormous amount of unnecessary O(N) renders.
**Action:** Always consider `React.memo` for list/map entry components.
