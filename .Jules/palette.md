## 2024-05-23 - Accessible Icon Buttons
**Learning:** Icon-only buttons used heavily in the shared task components (like Add, Done, Delete, Top) lacked accessible names, making them invisible to screen readers, and lacked tooltips, making them confusing for visual users.
**Action:** When adding new icon-only action buttons to lists or queues, always explicitly provide an `aria-label` for screen readers and a `title` attribute for visual tooltips.
