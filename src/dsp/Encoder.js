export class Encoder {
    constructor(audioContext, config = {}) {
        this.ctx = audioContext;
        this.config = {
            mark: config.mark || 19000,
            space: config.space || 18500,
            duration: config.duration || 0.1,
            ...config
        };
    }

    generateSignal(bits) {
        let now = this.ctx.currentTime;

        // Barker sequence preamble for synchronization [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1]
        const preamble = [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1];
        const fullPayload = preamble.concat(bits);

        fullPayload.forEach((bit, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            const freq = bit === 1 ? this.config.mark : this.config.space;
            const start = now + (i * this.config.duration);
            const stop = start + this.config.duration;

            osc.frequency.setValueAtTime(freq, start);

            // Hanning-like amplitude envelope to prevent clicks and spectral leakage
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(1, start + (this.config.duration * 0.1));
            gain.gain.setValueAtTime(1, stop - (this.config.duration * 0.1));
            gain.gain.linearRampToValueAtTime(0, stop);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(start);
            osc.stop(stop);
        });
    }
}
