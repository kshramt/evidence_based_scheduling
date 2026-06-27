## 2024-06-27 - Memoization for QueueEntry components
**Learning:** Virtualized lists and complex React trees in this application require memoization for large components like `QueueEntry` to prevent O(N) re-renders when parent components (like the virtualized queue) update their state.
**Action:** Always wrap list entry components in `React.memo` and ensure a `displayName` is set to aid debugging and enforce performance optimization for large data sets.
