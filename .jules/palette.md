# Palette's Journal

## 2025-01-31 - Icon-only buttons accessibility pattern
**Learning:** Icon-only buttons relying on Material Icon ligatures (e.g., `<span ...>add</span>`) require explicit `aria-label` attributes, as the ligature text alone is insufficient for screen readers. Inputs next to these buttons also lacked `placeholder` text, reducing context.
**Action:** Always verify icon-only buttons have `aria-label` and `title`. Add descriptive `placeholder` text to inputs. Ensure consistent class names (e.g., `btn-icon` instead of `icon-icon`).
