## 2024-05-23 - [Optimizing Recursive Component Subscriptions]
**Learning:** `EdgeList` components (used recursively in the tree view) were subscribing to the entire `statuses` map. This caused O(N) re-renders of all visible tree nodes whenever *any* single node's status changed.
**Action:** Used `useSelector` with a selector that derives the specific list of edge IDs for the current node, and passed `shallowEqual` to `useSelector`. This ensures the component only re-renders when the *structure* or *relevant statuses* of its children change, not when unrelated state updates.

## 2026-02-27 - [Vitest Concurrency in CI]
**Learning:** Running Vitest browser tests in CI without disabling file parallelism can cause race conditions where one test file's navigation interrupts another, leading to `page.goto` failures.
**Action:** Set `fileParallelism: false` in `client/vite.config.ts` to ensure tests run sequentially in the single browser instance provided by Vitest browser mode.
