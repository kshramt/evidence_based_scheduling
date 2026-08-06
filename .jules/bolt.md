## 2026-08-06 - Memoized QueueEntry Component
**Learning:** The QueueEntry component inside the Virtualized list in QueueNodes is mapped over large datasets. Without `React.memo`, updating one item triggers re-renders for all items inside the queue list (O(N)), which negatively impacts scrolling and list updating performance.
**Action:** Applied `React.memo()` to prevent unneeded O(N) list renders in the queue.
