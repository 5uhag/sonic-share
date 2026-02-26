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
    }

    async startMicrophone() {
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

    processLoop() {
        if (!this.isListening) return;

        this.analyser.getFloatFrequencyData(this.dataArray);

        const markMagnitude = this.dataArray[this.markBin];
        const spaceMagnitude = this.dataArray[this.spaceBin];

        // Basic threshold detection for Phase 2 proof of concept
        // In Phase 3, this will be replaced by a robust moving average and Barker correlation
        if (markMagnitude > -60 && markMagnitude > spaceMagnitude + 10) {
            if (this.onBitReceived) this.onBitReceived(1, markMagnitude);
        } else if (spaceMagnitude > -60 && spaceMagnitude > markMagnitude + 10) {
            if (this.onBitReceived) this.onBitReceived(0, spaceMagnitude);
        }

        requestAnimationFrame(() => this.processLoop());
    }
}
