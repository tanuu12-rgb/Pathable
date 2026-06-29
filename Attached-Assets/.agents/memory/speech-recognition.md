---
name: SpeechRecognition browser API types
description: Web Speech API types are not included in the tsconfig lib for pathable; use any-casting.
---

**Rule:** Use `(window as any).SpeechRecognition` and `event: any` for speech recognition — do not reference `SpeechRecognition` or `SpeechRecognitionEvent` as named types.

**Why:** The TypeScript lib does not include Web Speech API types by default; adding `@types/web` or lib entries is unnecessary when simple `any`-casting works.

**How to apply:**
```typescript
const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = new SR();
recognition.onresult = (event: any) => { ... };
```
