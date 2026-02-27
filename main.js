import './style.css'

import { Encoder } from './src/dsp/Encoder.js';
import { Decoder } from './src/dsp/Decoder.js';
import { SSTVEncoder } from './src/dsp/SSTVEncoder.js';

let audioCtx = null;
let encoder = null;
let decoder = null;
let sstvEncoder = null;

function initAudio() {
    if (!audioCtx) {
        // AudioContext must be resumed/created after a user gesture
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Default configs based on current UI state
        const config = isAudible ? { mark: 3000, space: 2500, duration: 0.1 } : { mark: 19500, space: 18500, duration: 0.1 };

        encoder = new Encoder(audioCtx, config);
        decoder = new Decoder(audioCtx, config);
        sstvEncoder = new SSTVEncoder(audioCtx);

        // Connect visualizer canvas to the decoder's analyser node
        connectVisualizer(decoder.analyser);

        decoder.onByteReceived = (char) => {
            const rxOutput = document.getElementById('rx-output');
            const p = rxOutput.querySelector('.placeholder-text');
            if (p) p.innerText = "";
            rxOutput.innerHTML += char;
            rxOutput.scrollTop = rxOutput.scrollHeight;
        };

        // For debugging bits dropping in
        decoder.onBitReceived = (bit, strength) => {
            // console.log(`RX Bit: ${bit} (Strength: ${strength.toFixed(2)} dB)`);
        };
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
            document.getElementById('connection-status').innerText = 'OFFLINE READY';
            document.querySelector('.dot').classList.replace('offline', 'online');
        }).catch((error) => {
            console.log('ServiceWorker registration failed: ', error);
            document.getElementById('connection-status').innerText = 'SW FAILED';
        });
    });
}

const knobCanvas = document.getElementById('tuning-knob');
const knobCtx = knobCanvas.getContext('2d');
const bandDisplay = document.getElementById('current-band');
const rxLog = document.getElementById('rx-log');
const btnTransmit = document.getElementById('btn-transmit');
const fileInput = document.getElementById('file-input');
const themeBtn = document.getElementById('theme-toggle');

// --- Theme Toggling ---
let isDark = localStorage.getItem('theme') === 'dark';
if (isDark) {
    document.body.setAttribute('data-theme', 'dark');
    themeBtn.innerText = 'LIGHT';
}

themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    if (isDark) {
        document.body.setAttribute('data-theme', 'dark');
        themeBtn.innerText = 'LIGHT';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
        themeBtn.innerText = 'DARK';
        localStorage.setItem('theme', 'light');
    }
    drawKnob(knobAngle); // force redraw with new colors
});

let isAudible = true;
let knobAngle = 0;

function drawKnob(angle) {
    const width = knobCanvas.width;
    const height = knobCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 45;

    knobCtx.clearRect(0, 0, width, height);

    // use CSS variables for canvas drawing to match theme
    const computedStyle = getComputedStyle(document.body);
    const textMain = computedStyle.getPropertyValue('--text-main').trim();
    const panelBg = computedStyle.getPropertyValue('--panel-bg').trim();

    knobCtx.beginPath(); knobCtx.arc(cx, cy, radius + 5, 0, 2 * Math.PI); knobCtx.fillStyle = textMain; knobCtx.fill();
    knobCtx.beginPath(); knobCtx.arc(cx, cy, radius, 0, 2 * Math.PI); knobCtx.fillStyle = panelBg; knobCtx.fill();
    knobCtx.lineWidth = 4; knobCtx.strokeStyle = textMain; knobCtx.stroke();
    knobCtx.beginPath(); knobCtx.moveTo(cx, cy);
    const indX = cx + Math.cos(angle) * (radius - 10);
    const indY = cy + Math.sin(angle) * (radius - 10);
    knobCtx.lineTo(indX, indY); knobCtx.lineWidth = 6; knobCtx.stroke();

    if (Math.abs(angle) > Math.PI / 2) {
        if (isAudible) {
            isAudible = false; bandDisplay.innerText = "ULTRASONIC (18-21kHz)"; bandDisplay.style.background = "#000";
            if (encoder) encoder.config = { ...encoder.config, mark: 19500, space: 18500 };
        }
    } else {
        if (!isAudible) {
            isAudible = true; bandDisplay.innerText = "AUDIBLE (1-5kHz)"; bandDisplay.style.background = "var(--accent-1)";
            if (encoder) encoder.config = { ...encoder.config, mark: 3000, space: 2500 };
        }
    }
}

let isDragging = false;
knobCanvas.addEventListener('mousedown', (e) => { isDragging = true; updateKnob(e); });
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => { if (!isDragging) return; updateKnob(e); });

function updateKnob(e) {
    const rect = knobCanvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    knobAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
    drawKnob(knobAngle);
}

drawKnob(0);

function logMessage(msg) {
    const span = document.createElement('span');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    span.innerText = `[${time}] ${msg}`;
    rxLog.appendChild(span);
    rxLog.scrollTop = rxLog.scrollHeight;
}

// --- File Handling (Images to Base64) ---
let currentImageData = null;

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        logMessage(`FILE SELECTED: ${file.name} (${file.size} bytes)`);

        const reader = new FileReader();
        reader.onload = function (event) {

            // If it's an image, prepare it for SSTV transmission (320x256)
            if (file.type.startsWith('image/')) {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 320;
                    canvas.height = 256;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });

                    // Force resize to match SSTV S1 specs
                    ctx.drawImage(img, 0, 0, 320, 256);
                    currentImageData = ctx.getImageData(0, 0, 320, 256);

                    document.getElementById('payload-input').value = `[IMAGE LOADED FOR SSTV: ${file.name}]`;
                    logMessage(`IMAGE ENCODED: Ready for SSTV Scottie S1 Transmission`);
                };
                img.src = event.target.result;
            } else {
                // For standard text/files, fallback to Base64 (original FSK logic)
                currentImageData = null;
                const base64String = event.target.result;
                const payloadInput = document.getElementById('payload-input');
                payloadInput.value = base64String;
                logMessage(`FILE ENCODED: Ready to transmit ${base64String.length} chars via FSK...`);
            }
        };
        reader.readAsDataURL(file);
    }
});

btnTransmit.addEventListener('click', () => {
    initAudio();
    const payload = document.getElementById('payload-input').value;
    if (!payload.trim() && !currentImageData) return alert("Enter a message or select an image to transmit.");

    if (audioCtx.state === 'suspended') audioCtx.resume();

    if (currentImageData) {
        // IMAGE TRANSMISSION: Use SSTV Protocol
        logMessage(`TX SSTV STARTED [Scottie S1]: ~111 seconds...`);
        sstvEncoder.generateSignal(currentImageData, () => {
            logMessage(`TX SSTV COMPLETE.`);
        });
    } else {
        // TEXT TRANSMISSION: Use Custom FSK System
        logMessage(`TX FSK STARTED [${isAudible ? 'AUDIBLE' : 'ULTRASONIC'}]: ${payload.substring(0, 15)}...`);
        // Very basic text-to-binary mapping for Phase 2 validation
        const bits = [];
        for (let i = 0; i < payload.length; i++) {
            const bin = payload.charCodeAt(i).toString(2).padStart(8, '0');
            for (let j = 0; j < 8; j++) bits.push(parseInt(bin[j]));
        }
        encoder.generateSignal(bits);
    }
});
