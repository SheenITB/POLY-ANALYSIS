import { PitchData } from './PitchDetector';
import { useRef, useEffect, useState } from 'react';

interface TuningIndicatorProps {
  pitchData: PitchData[];
}

// Note colors for the indicator arc
const noteArcColors = {
  'C': '#ef4444',     // red
  'C#': '#f97316',    // orange
  'D': '#f59e0b',     // amber
  'D#': '#eab308',    // yellow
  'E': '#84cc16',     // lime
  'F': '#22c55e',     // green
  'F#': '#10b981',    // emerald
  'G': '#06b6d4',     // cyan
  'G#': '#0ea5e9',    // sky
  'A': '#3b82f6',     // blue
  'A#': '#a855f7',    // purple
  'B': '#ec4899',     // pink
};

export function TuningIndicator({ pitchData }: TuningIndicatorProps) {
  const primaryPitch = pitchData.length > 0 ? pitchData[0] : null;
  
  // Smooth the cents value to avoid jitter
  const [smoothCents, setSmoothCents] = useState(0);
  const [smoothFreq, setSmoothFreq] = useState(0);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(Date.now());
  
  useEffect(() => {
    const targetCents = primaryPitch?.cents ?? 0;
    const targetFreq = primaryPitch?.frequency ?? 0;
    
    // If no pitch, reset to zero
    if (!primaryPitch) {
      setSmoothCents(0);
      setSmoothFreq(0);
      return;
    }
    
    const smoothing = 0.4; // INCREASED for more responsiveness (was 0.2)
    const threshold = 0.05; // Stop updating when close enough
    
    function animate() {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000; // seconds
      lastUpdateRef.current = now;
      
      setSmoothCents(prev => {
        const diff = targetCents - prev;
        if (Math.abs(diff) < threshold) return targetCents;
        return prev + diff * smoothing;
      });
      
      setSmoothFreq(prev => {
        const diff = targetFreq - prev;
        if (Math.abs(diff) < 0.1) return targetFreq;
        return prev + diff * smoothing;
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [primaryPitch?.cents, primaryPitch?.frequency, primaryPitch]);
  
  const isInTune = Math.abs(smoothCents) < 5;
  
  // Calculate position for the indicator
  const clampedCents = Math.max(-50, Math.min(50, smoothCents));
  const percentage = ((clampedCents + 50) / 100) * 100; // 0-100%
  
  const noteColor = primaryPitch ? noteArcColors[primaryPitch.note as keyof typeof noteArcColors] : '#22c55e';
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
      <div className="w-full" style={{ height: '540px', transform: 'scale(1)', transformOrigin: 'center' }}>
        <div className="w-full h-full flex flex-col justify-center gap-6 px-6">
          
          {/* Top: Note Display */}
          <div className="text-center flex-shrink-0">
            <div className="inline-flex items-baseline gap-3 bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-4 rounded-2xl border-2 border-slate-700 shadow-2xl">
              <span 
                className="text-[100px] font-mono font-black leading-none"
                style={{ 
                  color: primaryPitch ? noteColor : '#475569',
                  textShadow: primaryPitch ? `0 0 30px ${noteColor}80` : 'none'
                }}
              >
                {primaryPitch?.note || '—'}
              </span>
              <span 
                className="text-5xl font-mono font-bold mb-2"
                style={{ color: primaryPitch ? '#ef4444' : '#475569' }}
              >
                {primaryPitch?.octave || ''}
              </span>
            </div>
          </div>

          {/* Middle: Tuning Meter */}
          <div className="relative flex-shrink-0">
            {/* Cents Value - Large Display */}
            <div className="text-center mb-4">
              <div 
                className="inline-block text-6xl font-mono font-black tabular-nums"
                style={{ 
                  color: isInTune ? noteColor : '#ef4444',
                  textShadow: `0 0 20px ${isInTune ? noteColor : '#ef4444'}80`
                }}
              >
                {primaryPitch ? `${smoothCents > 0 ? '+' : ''}${smoothCents.toFixed(1)}` : '+0.0'}
                <span className="text-3xl ml-2 opacity-70">¢</span>
              </div>
            </div>

            {/* Horizontal Meter Bar */}
            <div className="relative h-24 bg-slate-950 rounded-2xl border-2 border-slate-700 shadow-inner overflow-hidden">
              {/* Background gradient zones */}
              <div className="absolute inset-0 flex">
                {/* Left zone (flat) */}
                <div className="flex-1 bg-gradient-to-r from-red-950/40 to-transparent"></div>
                {/* Center zone (in tune) */}
                <div className="w-1/5 bg-gradient-to-r from-transparent via-emerald-950/40 to-transparent"></div>
                {/* Right zone (sharp) */}
                <div className="flex-1 bg-gradient-to-l from-red-950/40 to-transparent"></div>
              </div>

              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 -ml-0.5 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/50 z-10"></div>

              {/* Tick marks */}
              <div className="absolute inset-0 flex items-center justify-between px-4">
                {Array.from({ length: 21 }, (_, i) => {
                  const centsValue = (i - 10) * 5;
                  const isMajorTick = centsValue % 10 === 0;
                  const isCenter = centsValue === 0;
                  
                  return (
                    <div key={i} className="flex flex-col items-center h-full justify-between py-2">
                      <div 
                        className={`${
                          isCenter ? 'h-14 w-1 bg-emerald-400 shadow-lg shadow-emerald-500/50' : 
                          isMajorTick ? 'h-8 w-0.5 bg-slate-500' : 
                          'h-5 w-0.5 bg-slate-600'
                        }`}
                      ></div>
                      {isMajorTick && (
                        <span className={`text-xs font-mono font-bold ${isCenter ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {centsValue === 0 ? '0' : centsValue > 0 ? `+${centsValue}` : centsValue}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Moving indicator needle */}
              {primaryPitch && (
                <div 
                  className="absolute top-0 bottom-0 w-2 transition-all duration-100 ease-out z-20"
                  style={{ 
                    left: `${percentage}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {/* Glow */}
                  <div 
                    className="absolute inset-0 blur-xl opacity-60"
                    style={{ backgroundColor: isInTune ? noteColor : '#ef4444' }}
                  ></div>
                  {/* Bar */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{ 
                      backgroundColor: isInTune ? noteColor : '#ef4444',
                      boxShadow: `0 0 20px ${isInTune ? noteColor : '#ef4444'}`
                    }}
                  ></div>
                  {/* Arrow pointer at top */}
                  <div 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent"
                    style={{ borderTopColor: isInTune ? noteColor : '#ef4444' }}
                  ></div>
                </div>
              )}
            </div>

            {/* Status badge */}
            {isInTune && primaryPitch && (
              <div className="text-center mt-4">
                <div 
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-lg animate-pulse"
                  style={{ 
                    backgroundColor: `${noteColor}30`,
                    color: noteColor,
                    border: `3px solid ${noteColor}`,
                    boxShadow: `0 0 15px ${noteColor}50`
                  }}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: noteColor, boxShadow: `0 0 8px ${noteColor}` }}
                  ></div>
                  IN TUNE
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Info Display */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 border-slate-700 text-center">
              <div className="text-xs text-slate-400 font-mono mb-1">FREQUENCY</div>
              <div className="text-2xl font-mono font-bold text-white">
                {primaryPitch ? `${smoothFreq.toFixed(2)}` : '—'}
                <span className="text-base text-slate-400 ml-1">Hz</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border-2 border-slate-700 text-center">
              <div className="text-xs text-slate-400 font-mono mb-1">DETECTED NOTES</div>
              <div className="text-2xl font-mono font-bold text-white">
                {pitchData.length}
                <span className="text-base text-slate-400 ml-1">{pitchData.length === 1 ? 'note' : 'notes'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}