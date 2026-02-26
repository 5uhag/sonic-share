# DECISIONS.md

## Architectural Decision Records (ADR)

### Phase 1 Decisions (2026-02-26)

**Scope & Approach**
- **UI Design**: Abandoned the "Cold War CRT / Green" aesthetic in favor of **Neo-Brutalism**. The user explicitly requested avoiding generic AI colors. We will implement high-contrast, bold typography, stark borders, and brutalist shapes.
- **Hosting**: The application will be hosted on **Vercel** for live demos.
- **PWA/Offline**: Confirmed that the 100% offline PWA requirement remains the top priority—once the Vercel site is loaded, all encoding/decoding must work offline.
- **Payloads**: Confirmed support for both text and file (image) encoding/decoding via audio.
- **Target Devices**: Desktop-to-Desktop primarily, with Android mobile support.

**Constraints**
- Keep the stack as light as possible. A minimal framework (like Vite + Vanilla JS/React) is acceptable if it guarantees the offline PWA functionality is "on point."
