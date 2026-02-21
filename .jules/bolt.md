## 2025-02-19 - Prettier Formatting Check
**Learning:** The CI pipeline runs `prettier --check src` which fails if files are not formatted. Always run `pnpm exec prettier --write src` or configure your editor to format on save before committing.
**Action:** Added a verification step to run prettier check locally before submitting.
