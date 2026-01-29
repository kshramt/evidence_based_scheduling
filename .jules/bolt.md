## 2026-01-29 - React Virtualization Performance
**Learning:** Components rendered by `react-virtuoso` via `itemContent` should be wrapped in `React.memo` to prevent unnecessary re-renders when the list container updates or scrolls.
**Action:** Always wrap row components in virtualized lists with `React.memo` unless they are extremely lightweight.
