## 2024-05-22 - React.memo on Virtuoso Items
**Learning:** `react-virtuoso` item components must be wrapped in `React.memo` to prevent unnecessary re-renders. This is critical for performance as the virtualized list container re-renders frequently.
**Action:** Ensure all components passed to `itemContent` in `Virtuoso` are memoized.

## 2024-05-22 - Missing Build Artifact Ignores
**Learning:** The `.gitignore` was missing `**/dist/`, causing build artifacts to risk being committed.
**Action:** Always check `.gitignore` before running build commands or committing.
