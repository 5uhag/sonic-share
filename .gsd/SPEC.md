# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Sonic-Link is an air-gapped, high-resilience Progressive Web App (PWA) acoustic transceiver that allows devices to communicate via sound waves (audible and near-ultrasonic). It features a striking Neo-Brutalism UI design and provides 100% offline capability, functioning purely through the Web Audio API without traditional network stacks. It is designed to be easily hosted on Vercel for live web demos, while remaining fully functional as an offline PWA once loaded.

## Goals
1. Implement a robust two-way acoustic communication link using Frequency Shift Keying (FSK) modulation via the Web Audio API.
2. Support transmission of both short text/control sequences and file/image payloads with reliable data integrity.
3. Ensure 100% offline functionality using Service Workers and Cache API (Offline-first PWA).
4. Create a performant, Neo-Brutalism UI (bold typography, high contrast, stark borders) for the encoder/decoder and visualization.
5. Provide a dual-mode system (audible 1-5kHz and ultrasonic 18-21kHz) to accommodate both high-reliability desktop-to-desktop environments and constrained Android mobile devices.
6. Support seamless deployment to Vercel for public access and demonstration.

## Non-Goals (Out of Scope)
- Long-distance communication (beyond standard room acoustic limitations).
- High-speed gigabit data transfers (throughput is limited by acoustic channel constraints).
- Reliance on external servers, databases, or cloud infrastructure during runtime.
- Complex user authentication or encryption (focus is on the physical layer and error correction first).

## Users
Security researchers, hobbyists, and individuals needing a robust, completely offline communication method across close-proximity devices (desktop-to-desktop, mobile-to-desktop) without relying on Wi-Fi, Bluetooth, or cellular networks.

## Constraints
- **Technical**: Must operate within the Web Audio API constraints and respect hardware Nyquist limits (especially on mobile microphones).
- **Framework**: Lightweight implementation (Vanilla JS or minimal build tool like Vite) prioritizing an air-tight Service Worker caching strategy for offline capability.
- **Environmental**: Acoustic interference (multi-path, ambient noise) must be mitigated via error correction (Hamming / Reed-Solomon) and synchronization preambles (Barker codes).

## Success Criteria
- [ ] Two devices can successfully exchange a text message purely over sound.
- [ ] Two devices can successfully exchange a small file/image over sound.
- [ ] Application loads and functions entirely without an active internet connection after initial caching.
- [ ] UI accurately responds to incoming audio with a real-time spectrogram and functional tuning controls.
- [ ] Error correction successfully recovers payloads in mildly noisy room conditions.
