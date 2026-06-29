---
name: noImplicitReturns in pathable tsconfig
description: The pathable frontend tsconfig enforces noImplicitReturns — all function paths must return or not return consistently.
---

**Rule:** Functions (including useEffect callbacks) with mixed explicit return/no-return trigger TS7030.

**Why:** `tsconfig.json` in pathable has `noImplicitReturns: true` via the extended base config.

**How to apply:** For useEffect with conditional cleanup, use a ref pattern:
```typescript
useEffect(() => {
  let tid: ReturnType<typeof setTimeout> | null = null;
  if (condition) tid = setTimeout(...);
  return () => { if (tid !== null) clearTimeout(tid); };
}, []);
```
This always returns a cleanup function, satisfying the type checker.
