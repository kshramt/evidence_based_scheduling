## 2026-02-05 - Virtualized List Performance
**Learning:** Components rendered via `react-virtuoso`'s `itemContent` (like `QueueEntry`) must be explicitly wrapped in `React.memo` to prevent parent-triggered re-renders, even when `react-compiler` is configured.
**Action:** Always wrap top-level list items in `React.memo` when using virtualization libraries.
