import React, { useState, useEffect, useRef } from 'react';
import { Knob } from './components/Knob';
import { Mixer } from './components/Mixer';
import { Visualizer, VisualizerHandle } from './components/Visualizer';
import { AudioSettings, PhysicsSettings } from './types';
import { audioService } from './services/audioEngine';
import { 
  Waves, 
  Activity, 
  MoveDown, 
  Sprout, 
  Merge, 
  Wind, 
  RotateCcw, 
  AudioLines, 
  Disc,
  Radar
} from 'lucide-react';

const App: React.FC = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const visualizerRef = useRef<VisualizerHandle>(null);

  // Audio State
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    volume: 0.7,
    low: 0,
    mid: 0,
    high: 0,
    reverbWet: 0.3,
    baseFrequency: 440
  });

  // Physics State (0-1 Normalized for knobs)
  const [physicsKnobs, setPhysicsKnobs] = useState({
    reverb: 0.3,
    tempo: 0.5,
    gravity: 0.0,
    budding: 0.0,
    cannibalism: 0.0,
    wind: 0.0,
    reverse: 0.0,
    tuning: 0.5,
    blackHole: 0.0,
    doppler: 0.5
  });

  // Derived Physics Settings for the Engine
  const physicsSettings: PhysicsSettings = {
    tempo: physicsKnobs.tempo * 2 + 0.1, // 0.1 to 2.1
    gravity: physicsKnobs.gravity,
    buddingChance: physicsKnobs.budding, // 0 to 1
    cannibalism: physicsKnobs.cannibalism,
    wind: physicsKnobs.wind,
    reverseChance: physicsKnobs.reverse,
    blackHole: physicsKnobs.blackHole,
    doppler: physicsKnobs.doppler
  };

  useEffect(() => {
    // Sync Audio Params
    const minFreq = 110;
    const maxFreq = 880;
    const newFreq = minFreq + (physicsKnobs.tuning * (maxFreq - minFreq));

    setAudioSettings(prev => ({
      ...prev,
      reverbWet: physicsKnobs.reverb,
      baseFrequency: newFreq
    }));

    audioService.updateSettings({
      ...audioSettings,
      reverbWet: physicsKnobs.reverb,
      baseFrequency: newFreq
    });
  }, [physicsKnobs.reverb, physicsKnobs.tuning, audioSettings.volume, audioSettings.low, audioSettings.mid, audioSettings.high]);

  const handleStart = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      audioService.init();
    }
    setIsPlaying(!isPlaying);
    if (!isPlaying) audioService.resume();
    else audioService.suspend();
  };

  const handleStop = () => {
    // RESET Logic
    setIsPlaying(false);
    audioService.suspend();
    if (visualizerRef.current) {
      visualizerRef.current.reset();
    }
  };

  const KnobWithIcon = ({ value, onChange, icon: Icon, label }: any) => (
    <div className="flex flex-col items-center gap-4 group relative" title={label}>
      <Knob 
        value={value} 
        onChange={onChange} 
        size={42} 
      />
      <div className="text-[#5F665F] group-hover:text-[#3F453F] transition-colors">
        <Icon size={16} strokeWidth={1.5} />
      </div>
    </div>
  );

  return (
    // Main BG: C1 Snow White
    <div className="min-h-screen bg-[#F2F2F0] text-[#2E2F2B] p-4 md:p-8 flex flex-col items-center pb-32 font-sans selection:bg-[#7A8476] selection:text-white">
      
      <header className="mb-8 text-center">
        {/* Title: C5 Dark Spruce */}
        <h1 className="text-3xl md:text-5xl font-light tracking-[0.2em] text-[#3F453F] lowercase">
          icicles chamber
        </h1>
        {/* Subtitle: C4 Pine Shadow */}
        <p className="text-[#5F665F] text-xs tracking-widest mt-2 uppercase">Generative Frost Synthesis</p>
      </header>

      <div className="w-full max-w-5xl relative">
        {/* Visualizer Box */}
        <div className="relative z-10 p-2 rounded-xl bg-[#D9DBD6] shadow-md">
           <Visualizer 
              ref={visualizerRef}
              isPlaying={isPlaying} 
              physics={physicsSettings}
              audioSettings={audioSettings}
           />
        </div>

        {/* The 10 Mystery Knobs */}
        {/* BG: C2 Cold Fog, Border: C3 Ash Grey */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-8 md:gap-x-12 px-8 py-10 bg-[#F2F2F0] rounded-[3rem] border border-[#B9BCB7] shadow-lg">
           
           {/* Row 1 */}
           <KnobWithIcon value={physicsKnobs.reverb} onChange={(v: number) => setPhysicsKnobs(p => ({...p, reverb: v}))} icon={Waves} label="Reverb" />
           <KnobWithIcon value={physicsKnobs.tempo} onChange={(v: number) => setPhysicsKnobs(p => ({...p, tempo: v}))} icon={Activity} label="Tempo" />
           <KnobWithIcon value={physicsKnobs.gravity} onChange={(v: number) => setPhysicsKnobs(p => ({...p, gravity: v}))} icon={MoveDown} label="Gravity" />
           <KnobWithIcon value={physicsKnobs.budding} onChange={(v: number) => setPhysicsKnobs(p => ({...p, budding: v}))} icon={Sprout} label="Budding" />
           <KnobWithIcon value={physicsKnobs.cannibalism} onChange={(v: number) => setPhysicsKnobs(p => ({...p, cannibalism: v}))} icon={Merge} label="Merge" />
           
           {/* Row 2 */}
           <KnobWithIcon value={physicsKnobs.wind} onChange={(v: number) => setPhysicsKnobs(p => ({...p, wind: v}))} icon={Wind} label="Wind" />
           <KnobWithIcon value={physicsKnobs.reverse} onChange={(v: number) => setPhysicsKnobs(p => ({...p, reverse: v}))} icon={RotateCcw} label="Reverse" />
           <KnobWithIcon value={physicsKnobs.tuning} onChange={(v: number) => setPhysicsKnobs(p => ({...p, tuning: v}))} icon={AudioLines} label="Tuning" />
           <KnobWithIcon value={physicsKnobs.blackHole} onChange={(v: number) => setPhysicsKnobs(p => ({...p, blackHole: v}))} icon={Disc} label="Black Hole" />
           <KnobWithIcon value={physicsKnobs.doppler} onChange={(v: number) => setPhysicsKnobs(p => ({...p, doppler: v}))} icon={Radar} label="Doppler" />

        </div>

        {/* Mixer Panel */}
        <Mixer 
          settings={audioSettings} 
          setSettings={setAudioSettings} 
          isPlaying={isPlaying}
          onPlayPause={handleStart}
          onStop={handleStop}
        />

        {!hasInteracted && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F2F2F0]/80 backdrop-blur-sm rounded-xl">
             <button 
                onClick={handleStart}
                className="px-8 py-4 bg-[#2E2F2B] text-[#F2F2F0] font-bold text-lg tracking-widest rounded-full hover:bg-[#3F453F] hover:scale-105 transition-all shadow-lg"
             >
                ENTER CHAMBER
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;