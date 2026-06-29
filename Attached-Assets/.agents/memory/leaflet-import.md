---
name: Leaflet static import rule
description: Why leaflet must be imported statically at the top of the file, never inside useEffect.
---

**Rule:** Always `import L from "leaflet"` at the top of the file. Never dynamically import inside `useEffect`.

**Why:** Dynamic imports inside useEffect cause React to create multiple instances, breaking hooks and causing errors.

**How to apply:** Any file that uses Leaflet maps must have `import L from "leaflet"` and `import "leaflet/dist/leaflet.css"` at the file top level.
