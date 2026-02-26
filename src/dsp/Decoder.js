export class Decoder {
    constructor(audioContext, config = {}) {
        this.ctx = audioContext;
        this.config = {
            mark: config.mark || 19000,
            space: config.space || 18500,
            duration: config.duration || 0.1,
            ...config
        };

        // Set up FFT
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Float32Array(this.analyser.frequencyBinCount);

        // Biquad filter to isolate our frequency band
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'bandpass';
        this.filter.frequency.value = (this.config.mark + this.config.space) / 2;
        this.filter.Q.value = 5;

        // Calculate FFT bins for mark and space
        const nyquist = this.ctx.sampleRate / 2;
        this.markBin = Math.round((this.config.mark / nyquist) * this.analyser.frequencyBinCount);
        this.spaceBin = Math.round((this.config.space / nyquist) * this.analyser.frequencyBinCount);

        this.source = null;
        this.isListening = false;
        this.onBitReceived = null;
        this.onByteReceived = null;

        // Barker-13 preamble for correlation
        this.preamble = [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1];
        this.bitBuffer = [];
        this.isSyncLocked = false;

        this.isSyncLocked = false;

        // Noise floor tracking - lowered significantly for phone mics
        this.noiseThreshold = -85; // dB init threshold
        this.lastProcessTime = 0;
    }

    async startMicrophone() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Microphone API is not available. This is usually because the site is not running on HTTPS.");
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.source = this.ctx.createMediaStreamSource(stream);
            this.source.connect(this.filter);
            this.filter.connect(this.analyser);
            this.isListening = true;
            this.processLoop();
        } catch (err) {
            console.error("Microphone access denied:", err);
            throw err;
        }
    }

    stopMicrophone() {
        this.isListening = false;
        if (this.source) {
            this.source.disconnect();
            this.source.mediaStream.getTracks().forEach(track => track.stop());
            this.source = null;
        }
    }

    processLoop(timestamp) {
        if (!this.isListening) return;
        requestAnimationFrame((ts) => this.processLoop(ts));

        // Throttle processing to roughly match the baud rate (duration per bit)
        if (timestamp - this.lastProcessTime < (this.config.duration * 1000) * 0.8) return;

        this.analyser.getFloatFrequencyData(this.dataArray);

        const markMagnitude = this.dataArray[this.markBin];
        const spaceMagnitude = this.dataArray[this.spaceBin];

        let bit = -1; // -1 means no clear signal

        // Dynamic thresholding: signal must be above noise and clearly defined
        // Reduced the gap requirement from 5dB to 2dB for cheaper mics
        if (markMagnitude > this.noiseThreshold || spaceMagnitude > this.noiseThreshold) {
            if (markMagnitude > spaceMagnitude + 2) {
                bit = 1;
                this.lastProcessTime = timestamp; // Lock time to this reading
            } else if (spaceMagnitude > markMagnitude + 2) {
                bit = 0;
                this.lastProcessTime = timestamp; // Lock time to this reading
            }
        }

        if (bit !== -1) {
            this.bitBuffer.push(bit);
            if (this.onBitReceived) this.onBitReceived(bit, Math.max(markMagnitude, spaceMagnitude));

            // Keep buffer size manageable (preamble length + 1 byte)
            if (this.bitBuffer.length > this.preamble.length + 8) {
                this.bitBuffer.shift();
            }

            this.checkForSyncAndDecode();
        }
    }

    checkForSyncAndDecode() {
        if (this.bitBuffer.length < this.preamble.length) return;

        // Sliding window cross-correlation for Barker sequence
        let correlation = 0;
        for (let i = 0; i < this.preamble.length; i++) {
            if (this.bitBuffer[i] === this.preamble[i]) correlation++;
        }

        // 10/13 match is more forgiving for loud room echo / cheap phone mics
        if (correlation >= this.preamble.length - 3 && !this.isSyncLocked) {
            this.isSyncLocked = true;
            console.log("SYNC LOCKED: Barker preamble detected");
        }

        if (this.isSyncLocked && this.bitBuffer.length >= this.preamble.length + 8) {
            // We have a full byte following the preamble
            const byteBits = this.bitBuffer.slice(this.preamble.length, this.preamble.length + 8);
            const byteValue = parseInt(byteBits.join(''), 2);
            const char = String.fromCharCode(byteValue);

            if (this.onByteReceived) this.onByteReceived(char);

            // Reset sync state to look for next frame
            this.bitBuffer = [];
            this.isSyncLocked = false;
        }
    }
}
