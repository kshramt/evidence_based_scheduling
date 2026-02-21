## 2025-02-19 - React.memo for Virtualized List Items
**Learning:** `QueueEntry` component used in `react-virtuoso` lists was not memoized, causing unnecessary re-renders when parent components updated, despite `Virtuoso` handling list virtualization.
**Action:** Always ensure components rendered via `itemContent` in virtualization libraries are wrapped in `React.memo` (or similar) if they rely on props that are stable (like IDs) but are re-created by parent renders.
