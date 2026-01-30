## 2025-02-18 - Missing ARIA Labels on Icon-Only Buttons
**Learning:** Many interactive elements in the codebase are icon-only buttons (using Material Icons) that lack accessible names (ARIA labels). Screen readers may rely on the ligature text (e.g., "add", "close"), which can be vague or insufficient.
**Action:** When touching any icon-only button, ensure it has an explicit `aria-label` or `aria-labelledby` attribute describing its specific action in context (e.g., "Add new item" instead of just "add").
