class LofiCrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'bitDepth', defaultValue: 24, minValue: 1, maxValue: 24, automationRate: 'k-rate' },
      { name: 'downsample', defaultValue: 1, minValue: 0.02, maxValue: 1, automationRate: 'k-rate' },
      { name: 'autoGain', defaultValue: 1, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.held = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const frames = output[0].length;
    const channels = output.length;

    while (this.held.length < channels) this.held.push(0);

    const bitArr = parameters.bitDepth;
    const downArr = parameters.downsample;
    const gainArr = parameters.autoGain;

    for (let i = 0; i < frames; i++) {
      const bitRaw = bitArr.length > 1 ? bitArr[i] : bitArr[0];
      const downRaw = downArr.length > 1 ? downArr[i] : downArr[0];
      const gainRaw = gainArr.length > 1 ? gainArr[i] : gainArr[0];

      const bit = Math.max(1, Math.min(24, bitRaw));
      const down = Math.max(0.02, Math.min(1, downRaw));
      const gain = Math.max(0.5, Math.min(2, gainRaw));

      this.phase += down;
      if (this.phase >= 1) {
        this.phase -= 1;
        for (let ch = 0; ch < channels; ch++) {
          const inCh = input && input[ch] ? input[ch] : null;
          this.held[ch] = inCh ? inCh[i] : 0;
        }
      }

      const step = 1 / Math.pow(2, bit - 1);
      for (let ch = 0; ch < channels; ch++) {
        const v = this.held[ch];
        const q = Math.round(v / step) * step;
        const out = Math.max(-1, Math.min(1, q * gain));
        output[ch][i] = out;
      }
    }

    return true;
  }
}

registerProcessor('lofi-crusher', LofiCrusherProcessor);
