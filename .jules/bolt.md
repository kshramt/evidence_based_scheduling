## 2024-05-23 - React.memo for Virtualized Lists
**Learning:** Components rendered by `react-virtuoso`'s `itemContent` (like `QueueEntry`) must be wrapped in `React.memo` to prevent unnecessary re-renders when parent components update, even if `react-compiler` is used.
**Action:** Always wrap list item components in `React.memo` when using virtualization libraries.

## 2024-05-23 - Test Stability
**Learning:** Parallel test execution in `vitest` causes navigation race conditions and timeouts in this codebase.
**Action:** Set `fileParallelism: false` in `client/vite.config.ts`.

## 2024-05-23 - Build Artifacts
**Learning:** The default `.gitignore` was missing standard build output directories (`dist`, `dev-dist`).
**Action:** Ensure `.gitignore` includes `**/dist/`, `**/dev-dist/`, and `*.log`.
