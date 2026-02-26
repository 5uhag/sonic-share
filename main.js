import './style.css'

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

let isAudible = true;
let knobAngle = 0;

function drawKnob(angle) {
    const width = knobCanvas.width;
    const height = knobCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = 45;

    knobCtx.clearRect(0, 0, width, height);
    knobCtx.beginPath(); knobCtx.arc(cx, cy, radius + 5, 0, 2 * Math.PI); knobCtx.fillStyle = '#000'; knobCtx.fill();
    knobCtx.beginPath(); knobCtx.arc(cx, cy, radius, 0, 2 * Math.PI); knobCtx.fillStyle = '#fff'; knobCtx.fill();
    knobCtx.lineWidth = 4; knobCtx.strokeStyle = '#000'; knobCtx.stroke();
    knobCtx.beginPath(); knobCtx.moveTo(cx, cy);
    const indX = cx + Math.cos(angle) * (radius - 10);
    const indY = cy + Math.sin(angle) * (radius - 10);
    knobCtx.lineTo(indX, indY); knobCtx.lineWidth = 6; knobCtx.stroke();

    if (Math.abs(angle) > Math.PI / 2) {
        if (isAudible) { isAudible = false; bandDisplay.innerText = "ULTRASONIC (18-21kHz)"; bandDisplay.style.background = "#000"; }
    } else {
        if (!isAudible) { isAudible = true; bandDisplay.innerText = "AUDIBLE (1-5kHz)"; bandDisplay.style.background = "var(--accent-1)"; }
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
    const payload = document.getElementById('payload-input').value;
    if (!payload.trim()) return alert("Enter a message to transmit.");
    logMessage(`TX STARTED [${isAudible ? 'AUDIBLE' : 'ULTRASONIC'}]: ${payload.substring(0, 15)}...`);
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) { logMessage(`FILE SELECTED: ${file.name} (${file.size} bytes)`); }
});
