## 2024-05-23 - [Memoize QueueEntry components]
**Learning:** `QueueEntry` and its children are used in both virtualized and non-virtualized lists. While `react-virtuoso` helps with rendering only visible items, updates to the list data (even if items are stable) or parent re-renders can trigger re-renders of all list items. Memoizing `QueueEntry` prevents this and ensures `react-virtuoso` updates are efficient.
**Action:** Always memoize list item components, especially if they are connected to the store or have complex children.
