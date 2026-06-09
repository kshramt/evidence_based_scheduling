## 2024-07-25 - CopyNodeIdButton Accessibility Fix
**Learning:** Icon-only buttons mapping to generic components like `CopyNodeIdButton` often miss explicit tooltips and ARIA labels. We need to implement dynamic labeling when states change (e.g., from "Copy" to "Copied") to ensure users get immediate screen reader and visual feedback.
**Action:** Always check interactive components containing solely constant icon markers (`consts.COPY_MARK`, etc.) to ensure they have an `aria-label` or `title` mapped to their state.
