## 2024-05-24 - React.memo on Virtualized List Items
**Learning:** Even though Virtuoso limits DOM nodes, un-memoized list components like QueueEntry can still experience unnecessary React render cycles when the parent context or store triggers updates. This causes O(N) React render overhead for all visible items.
**Action:** Always wrap top-level list item components (e.g., QueueEntry) in `React.memo` and append `displayName` to ensure React DevTools readability while preventing re-render cascades.
