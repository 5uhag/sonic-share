export class SSTVEncoder {
    constructor(audioContext) {
        this.ctx = audioContext;

        // Scottie S1 Timing Constants (ms)
        this.SYNC = 9.0;
        this.SEPARATOR = 1.5;
        this.PIXEL = 0.4320;

        // frequencies (Hz)
        this.SYNC_FREQ = 1200;
        this.SEP_FREQ = 1500;
        this.BLACK_FREQ = 1500;
        this.WHITE_FREQ = 2300;
        this.RANGE = this.WHITE_FREQ - this.BLACK_FREQ;

        // VIS Header (Scottie S1 = 60)
        this.VIS_CODE = [
            0, 0, 1, 1, 1, 1, 0, // 60 in binary padded to 7 bits, LSB first
            0 // Parity bit (even parity for 4 ones is 0)
        ];
    }

    // Helper to schedule a single tone
    scheduleTone(osc, freq, durationMs, startTime) {
        osc.frequency.setValueAtTime(freq, startTime);
        return startTime + (durationMs / 1000);
    }

    // Encodes a 320x256 ImageData buffer into an audio schedule
    generateSignal(imageData, onComplete) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Prevent clicking at start/end
        let time = this.ctx.currentTime + 0.1;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1, time + 0.05);

        // --- 1. Calibration Header ---
        time = this.scheduleTone(osc, 1900, 300, time);
        time = this.scheduleTone(osc, 1200, 10, time);
        time = this.scheduleTone(osc, 1900, 300, time);
        time = this.scheduleTone(osc, 1200, 30, time);

        // --- 2. VIS Code for Scottie S1 (60) ---
        // Bit 1 = 1100Hz, Bit 0 = 1300Hz (30ms per bit)
        for (const bit of this.VIS_CODE) {
            const freq = bit === 1 ? 1100 : 1300;
            time = this.scheduleTone(osc, freq, 30, time);
        }
        time = this.scheduleTone(osc, 1200, 30, time); // Stop bit

        // --- 3. Image Scanlines ---
        // Scottie encodes Green -> Blue -> Red
        const width = 320;
        const height = 256;

        // Start sync (first line only)
        time = this.scheduleTone(osc, this.SYNC_FREQ, this.SYNC, time);

        // Warning: This loop creates 320x256x3 = 245,760 schedule events! 
        // We will throttle this by pre-calculating continuous frequency ramps for entire rows instead of per-pixel if necessary
        for (let y = 0; y < height; y++) {
            const rowStart = y * width * 4;

            for (const colorIdx of [1, 2, 0]) { // Green (1), Blue (2), Red (0)

                if (colorIdx === 0) {
                    // Sync pulse before the Red channel
                    time = this.scheduleTone(osc, this.SYNC_FREQ, this.SYNC, time);
                }

                // Color Separator
                time = this.scheduleTone(osc, this.SEP_FREQ, this.SEPARATOR, time);

                // Pixel Data for this line
                for (let x = 0; x < width; x++) {
                    const val = imageData.data[rowStart + (x * 4) + colorIdx];
                    const freq = this.BLACK_FREQ + (this.RANGE * (val / 255.0));
                    time = this.scheduleTone(osc, freq, this.PIXEL, time);
                }
            }
        }

        // Fade out
        gain.gain.setValueAtTime(1, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.05);
        time += 0.05;

        // Execute Schedule
        osc.start(this.ctx.currentTime + 0.1);
        osc.stop(time);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
            if (onComplete) onComplete();
        };

        return time - this.ctx.currentTime;
    }
}
