import './style.css'

import { Encoder } from './src/dsp/Encoder.js';
import { Decoder } from './src/dsp/Decoder.js';

let audioCtx = null;
let encoder = null;
let decoder = null;

function initAudio() {
    if (!audioCtx) {
        // AudioContext must be resumed/created after a user gesture
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Default configs based on current UI state
        const config = isAudible ? { mark: 3000, space: 2500, duration: 0.1 } : { mark: 19500, space: 18500, duration: 0.1 };

        encoder = new Encoder(audioCtx, config);
        decoder = new Decoder(audioCtx, config);

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

btnTransmit.addEventListener('click', () => {
    initAudio();
    const payload = document.getElementById('payload-input').value;
    if (!payload.trim()) return alert("Enter a message to transmit.");
    logMessage(`TX STARTED [${isAudible ? 'AUDIBLE' : 'ULTRASONIC'}]: ${payload.substring(0, 15)}...`);

    // Very basic text-to-binary mapping for Phase 2 validation
    const bits = [];
    for (let i = 0; i < payload.length; i++) {
        const bin = payload.charCodeAt(i).toString(2).padStart(8, '0');
        for (let j = 0; j < 8; j++) bits.push(parseInt(bin[j]));
    }

    if (audioCtx.state === 'suspended') audioCtx.resume();
    encoder.generateSignal(bits);
});

const btnListen = document.getElementById('btn-listen');
let isListening = false;
btnListen.addEventListener('click', async () => {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    isListening = !isListening;
    if (isListening) {
        btnListen.innerText = "STOP LISTENING";
        btnListen.style.background = "red";
        btnListen.style.color = "white";
        logMessage(`RX STARTED [${isAudible ? 'AUDIBLE' : 'ULTRASONIC'}] - Awaiting preamble...`);
        document.querySelector('.placeholder-text').innerText = "LISTENING ON MIC...";
        await decoder.startMicrophone();
    } else {
        btnListen.innerText = "START LISTENING";
        btnListen.style.background = "";
        btnListen.style.color = "";
        logMessage("RX STOPPED.");
        document.querySelector('.placeholder-text').innerText = "WAITING FOR SIGNAL...";
        decoder.stopMicrophone();
    }
});

function connectVisualizer(analyser) {
    const canvas = document.getElementById('spectrogram');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const freqData = new Uint8Array(analyser.frequencyBinCount);

    // Fill initial canvas with black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function drawWaterfall() {
        requestAnimationFrame(drawWaterfall);
        if (!isListening && (!encoder || audioCtx.state === 'suspended')) return;

        analyser.getByteFrequencyData(freqData);

        // Shift old waterfall down by 1px
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height - 1);
        ctx.putImageData(imageData, 0, 1);

        // Draw new row of frequencies at the top (idx 0)
        // Only map the relevant portion of the spectrum to make it visible
        const startBin = Math.floor(analyser.frequencyBinCount * 0.05); // skip sub-bass
        const endBin = Math.floor(analyser.frequencyBinCount * 0.95);
        const range = endBin - startBin;

        for (let x = 0; x < canvas.width; x++) {
            const dataIndex = startBin + Math.floor((x / canvas.width) * range);
            const value = freqData[dataIndex];

            // Heatmap color scaling (Black -> Blue -> Red -> Yellow)
            let r = 0, g = 0, b = 0;
            if (value < 64) { b = value * 4; }
            else if (value < 128) { r = (value - 64) * 4; b = 255 - (value - 64) * 4; }
            else if (value < 192) { r = 255; g = (value - 128) * 4; }
            else { r = 255; g = 255; b = (value - 192) * 4; }

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, 0, 1, 1);
        }
    }
    drawWaterfall();
}

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) { logMessage(`FILE SELECTED: ${file.name} (${file.size} bytes)`); }
});
