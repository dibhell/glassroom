import { AudioSettings, SoundType } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null; // The Limiter
  private analyser: AnalyserNode | null = null; // Output Analyzer
  
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  
  // EQ Nodes
  private lowEQ: BiquadFilterNode | null = null;
  private midEQ: BiquadFilterNode | null = null;
  private highEQ: BiquadFilterNode | null = null;

  private customBuffer: AudioBuffer | null = null;
  private soundType: SoundType = SoundType.SYNTH;

  // Pentatonic Minor Scale ratios relative to root
  private scale = [1, 1.2, 1.33, 1.5, 1.714, 2]; 

  public init() {
    if (this.ctx) return;

    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256; // Low resolution is enough for peak detection
    this.analyser.smoothingTimeConstant = 0.3;

    // Create Limiter (Dynamics Compressor) - ALWAYS ON CONFIGURATION
    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.value = -2; // Start compressing at -2dB
    this.limiterNode.knee.value = 0; // Hard knee for limiting
    this.limiterNode.ratio.value = 20; // High ratio acts as a wall
    this.limiterNode.attack.value = 0.001; // Instant attack
    this.limiterNode.release.value = 0.2; // Quick release

    // Create Master
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    // Create EQ
    this.lowEQ = this.ctx.createBiquadFilter();
    this.lowEQ.type = 'lowshelf';
    this.lowEQ.frequency.value = 320;

    this.midEQ = this.ctx.createBiquadFilter();
    this.midEQ.type = 'peaking';
    this.midEQ.frequency.value = 1000;
    this.midEQ.Q.value = 0.5;

    this.highEQ = this.ctx.createBiquadFilter();
    this.highEQ.type = 'highshelf';
    this.highEQ.frequency.value = 3200;

    // Create Reverb Chain
    this.reverbNode = this.ctx.createConvolver();
    this.createImpulseResponse();
    this.reverbGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();
    
    // Chain: 
    // Source -> [Dry + Reverb] -> EQ -> Master -> Limiter -> Analyser -> Dest
    
    // Reverb Mixing
    this.reverbNode.connect(this.reverbGain);
    
    // Connect EQ Chain
    this.reverbGain.connect(this.lowEQ);
    this.dryGain.connect(this.lowEQ);

    this.lowEQ.connect(this.midEQ);
    this.midEQ.connect(this.highEQ);
    this.highEQ.connect(this.masterGain);
    
    // Connect Master -> Limiter -> Analyser -> Dest
    this.masterGain.connect(this.limiterNode);
    this.limiterNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public getPeakLevel(): number {
    if (!this.analyser) return -100;
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    
    let max = 0;
    for(let i = 0; i < data.length; i++) {
        if(Math.abs(data[i]) > max) max = Math.abs(data[i]);
    }

    // Convert amplitude to dB
    // Avoid log(0) = -Infinity
    if (max === 0) return -100;
    return 20 * Math.log10(max);
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  private createImpulseResponse() {
    if (!this.ctx || !this.reverbNode) return;
    const rate = this.ctx.sampleRate;
    const length = rate * 6.0; 
    const decay = 3.0;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const n = i / length;
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    this.reverbNode.buffer = impulse;
  }

  public updateSettings(settings: AudioSettings) {
    if (!this.ctx) return;

    // Volume
    if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(settings.volume, this.ctx.currentTime, 0.1);
    }

    // EQ
    if (this.lowEQ) this.lowEQ.gain.setTargetAtTime(settings.low, this.ctx.currentTime, 0.1);
    if (this.midEQ) this.midEQ.gain.setTargetAtTime(settings.mid, this.ctx.currentTime, 0.1);
    if (this.highEQ) this.highEQ.gain.setTargetAtTime(settings.high, this.ctx.currentTime, 0.1);

    // Reverb Mix
    if (this.reverbGain && this.dryGain) {
        this.reverbGain.gain.setTargetAtTime(settings.reverbWet * 1.5, this.ctx.currentTime, 0.1);
        this.dryGain.gain.setTargetAtTime(1 - (settings.reverbWet * 0.4), this.ctx.currentTime, 0.1);
    }
  }

  public async loadSample(file: File) {
    if (!this.ctx) return;
    const arrayBuffer = await file.arrayBuffer();
    this.customBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.soundType = SoundType.SAMPLE;
  }

  /**
   * Triggers a sound with spatial characteristics.
   * @param sizeFactor 0 to 1 (Large to Small)
   * @param baseFreq Hz
   * @param pan -1 (Left) to 1 (Right)
   * @param depth 0 (Close) to 1 (Far) - affects LowPass Filter
   * @param velocityZ Speed in Z axis - affects Doppler
   * @param dopplerIntensity 0 to 1 (Knob value)
   * @param isReverse Play backwards
   * @param volume 0 to 1
   */
  public triggerSound(
    sizeFactor: number, 
    baseFreq: number, 
    pan: number = 0, 
    depth: number = 0, 
    velocityZ: number = 0,
    dopplerIntensity: number = 0,
    isReverse: boolean = false, 
    volume: number = 0.5
  ) {
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    
    // --- SPATIAL CHAIN ---
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    const depthFilter = this.ctx.createBiquadFilter();
    depthFilter.type = 'lowpass';
    const minCutoff = 500;
    const maxCutoff = 20000;
    const cutoff = maxCutoff * Math.pow(minCutoff / maxCutoff, depth);
    depthFilter.frequency.value = cutoff;
    depthFilter.Q.value = 0.5; 

    depthFilter.connect(panner);
    const sourceGain = this.ctx.createGain();
    panner.connect(sourceGain);
    sourceGain.connect(this.dryGain!);
    sourceGain.connect(this.reverbNode!);

    // --- FREQUENCY CALCULATION (Scale + Doppler) ---
    const interval = this.scale[Math.floor(Math.random() * this.scale.length)];
    const octave = sizeFactor > 0.8 ? 0.5 : sizeFactor < 0.3 ? 2 : 1;
    let finalFreq = baseFreq * interval * octave;

    // Doppler Effect Logic
    // Scaled by dopplerIntensity. If knob is 0, dopplerCents is 0.
    // If knob is 1, max shift is significantly higher.
    const maxDopplerShift = 200; // Cents
    const dopplerCents = velocityZ * -maxDopplerShift * dopplerIntensity; 
    
    finalFreq = finalFreq * Math.pow(2, dopplerCents / 1200);

    const duration = isReverse ? 2.5 : 2.0;
    const safeVolume = volume * 0.7; 
    const targetVol = Math.max(0.01, Math.min(safeVolume, 1.0));

    // --- SOUND GENERATION ---
    if (this.soundType === SoundType.SAMPLE && this.customBuffer) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.customBuffer;
      const rate = finalFreq / 440; 
      
      if (isReverse) {
          const revBuffer = this.createReverseBuffer(this.customBuffer);
          source.buffer = revBuffer;
      }

      source.playbackRate.value = Math.max(0.1, Math.min(rate, 4.0));
      
      sourceGain.gain.setValueAtTime(targetVol, now);
      sourceGain.gain.exponentialRampToValueAtTime(0.001, now + (this.customBuffer.duration / source.playbackRate.value));

      source.connect(depthFilter);
      source.start();
    } else {
      const osc = this.ctx.createOscillator();
      const mod = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = finalFreq;

      mod.type = 'sine';
      mod.frequency.value = finalFreq * 2.5;
      modGain.gain.value = 100 * (1 - sizeFactor);

      mod.connect(modGain);
      modGain.connect(osc.frequency);

      osc.connect(depthFilter);
      
      sourceGain.gain.setValueAtTime(0, now);

      if (isReverse) {
        sourceGain.gain.exponentialRampToValueAtTime(targetVol, now + duration - 0.1);
        sourceGain.gain.linearRampToValueAtTime(0, now + duration);
      } else {
        sourceGain.gain.linearRampToValueAtTime(targetVol, now + 0.02);
        sourceGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      }

      osc.start(now);
      mod.start(now);
      
      osc.stop(now + duration + 0.2);
      mod.stop(now + duration + 0.2);
      setTimeout(() => {
          depthFilter.disconnect();
          panner.disconnect();
          sourceGain.disconnect();
      }, (duration + 0.5) * 1000);
    }
  }

  private createReverseBuffer(buffer: AudioBuffer): AudioBuffer {
      if (!this.ctx) return buffer;
      const revBuffer = this.ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
      for (let i = 0; i < buffer.numberOfChannels; i++) {
          const dest = revBuffer.getChannelData(i);
          const src = buffer.getChannelData(i);
          for (let j = 0; j < src.length; j++) {
              dest[j] = src[src.length - 1 - j];
          }
      }
      return revBuffer;
  }
}

export const audioService = new AudioEngine();