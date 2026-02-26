# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0

## Must-Haves (from SPEC)
- [ ] Two-way FSK acoustic modem (encoder/decoder).
- [ ] Offline-first PWA infrastructure (Service Worker).
- [ ] Neo-Brutalism UI (Encoder/Decoder, Spectrogram).
- [ ] Error Correction (Hamming for text, Reed-Solomon for files).
- [ ] Payload normalization (Base64) and framing (Barker codes).

## Phases

### Phase 1: Foundation & Project Setup
**Status**: ⬜ Not Started
**Objective**: Initialize the project structure, PWA service worker, and basic UI layout for the Neo-Brutalism design.

### Phase 2: Core DSP & Physical Layer
**Status**: ⬜ Not Started
**Objective**: Implement the Web Audio API engine, including the Oscillator-based transmitter and FFT-based receiver with Barker code synchronization.

### Phase 3: Modulation & Error Correction
**Status**: ⬜ Not Started
**Objective**: Implement Frequency Shift Keying (FSK) logic, Base64 encoding/decoding, and integrate Hamming(7,4) and Reed-Solomon error correction libraries.

### Phase 4: Integration & Polish
**Status**: ⬜ Not Started
**Objective**: Connect the physical layer to the UI (Spectrogram waterfall, tuning knob), finalize offline caching strategies, and test desktop-to-desktop and desktop-to-mobile communications.
