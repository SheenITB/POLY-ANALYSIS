import { useState } from 'react';
import { NoteDisplay } from './NoteDisplay';
import { TuningIndicator } from './TuningIndicator';
import { PitchData } from './PitchDetector';
import { Mic, MicOff, Sparkles, Music2, Target } from 'lucide-react';

interface PageTabsProps {
  pitchData: PitchData[];
  waveformData: Record<string, number[]>;
  isListening: boolean;
  onToggleListening: () => void;
}

export function PageTabs({ pitchData, waveformData, isListening, onToggleListening }: PageTabsProps) {
  const [activePage, setActivePage] = useState(0);

  const pages = [
    { id: 0, name: 'Start', icon: Sparkles, gradient: 'from-purple-500 via-pink-500 to-cyan-500' },
    { id: 1, name: 'Polyphonic', icon: Music2, gradient: 'from-cyan-500 via-blue-500 to-indigo-500' },
    { id: 2, name: 'Precision', icon: Target, gradient: 'from-emerald-500 via-teal-500 to-cyan-500' },
  ];

  // Get primary pitch for info panel
  const primaryPitch = pitchData.length > 0 ? pitchData[0] : null;

  return (
    <div className="bg-slate-900 backdrop-blur-sm overflow-hidden border border-slate-700 w-[600px] h-[600px] flex flex-col">
      {/* Tab Navigation */}
      <div className="flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b-2 border-slate-700/50">
        {pages.map((page) => {
          const Icon = page.icon;
          return (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`group flex-1 px-4 py-3.5 transition-all duration-300 relative overflow-hidden ${
                activePage === page.id
                  ? 'bg-slate-800/50'
                  : 'hover:bg-slate-800/30'
              }`}
            >
              {/* Gradient Border Bottom */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 ${
                activePage === page.id 
                  ? `bg-gradient-to-r ${page.gradient} opacity-100` 
                  : 'bg-slate-600 opacity-0 group-hover:opacity-50'
              }`}></div>
              
              {/* Content */}
              <div className="flex items-center justify-center gap-2">
                <Icon className={`w-4 h-4 transition-all duration-300 ${
                  activePage === page.id
                    ? 'text-transparent bg-clip-text'
                    : 'text-slate-500 group-hover:text-slate-400'
                }`} 
                style={activePage === page.id ? {
                  filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))'
                } : {}}
                />
                <span className={`text-sm tracking-wider transition-all duration-300 ${
                  activePage === page.id
                    ? `text-transparent bg-clip-text bg-gradient-to-r ${page.gradient}`
                    : 'text-slate-500 group-hover:text-slate-400'
                }`} style={{ fontWeight: activePage === page.id ? 600 : 500 }}>
                  {page.name}
                </span>
              </div>
              
              {/* Glow effect on active */}
              {activePage === page.id && (
                <div className={`absolute inset-0 bg-gradient-to-r ${page.gradient} opacity-5 pointer-events-none`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Page Content - STRUTTURA IDENTICA PER TUTTE E 3 */}
      <div className="h-[600px]">
        {/* PAGINA 1: ANALYZE */}
        {activePage === 0 && (
          <div className="h-full bg-gradient-to-br from-slate-900 via-purple-950 to-blue-950">
            <div className="h-[50px] px-4 bg-gradient-to-r from-purple-900/30 via-purple-800/30 to-indigo-900/30 border-b border-purple-500/30 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-300 tracking-wide" style={{ fontSize: '15px', fontWeight: 600 }}>
                Real-Time Analysis
              </span>
            </div>
            <div className="h-[550px] overflow-hidden">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-500/50">
                    <Mic className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl text-slate-100 mb-6">Ready to analyze</h3>
                  
                  <button
                    onClick={onToggleListening}
                    className={`px-8 py-4 rounded-lg font-mono text-base transition-all duration-300 flex items-center gap-3 mx-auto mb-6 shadow-2xl ${
                      isListening 
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-red-500/50' 
                        : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white shadow-emerald-500/50'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        Start Listening
                      </>
                    )}
                  </button>
                  
                  <p className="text-sm text-slate-300 mb-6">
                    {isListening 
                      ? 'Listening for audio input. Play multiple notes simultaneously!' 
                      : 'Click to begin real-time polyphonic pitch detection.'
                    }
                  </p>
                  
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700 text-left space-y-3 max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium">Polyphonic Detection</p>
                        <p className="text-xs text-slate-400">Detect up to 6 simultaneous notes</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium">High Precision</p>
                        <p className="text-xs text-slate-400">Accuracy within ±5 cents</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-pink-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium">Real-time Waveform</p>
                        <p className="text-xs text-slate-400">Visual feedback for each note</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium">FFT Analysis</p>
                        <p className="text-xs text-slate-400">8192-point FFT for frequency resolution</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGINA 2: CHROMATIC SCALE */}
        {activePage === 1 && (
          <div className="h-full bg-black">
            <div className="h-[50px] px-4 bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-indigo-900/30 border-b border-cyan-500/30 flex items-center gap-3">
              <Music2 className="w-5 h-5 text-cyan-400" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 tracking-wide" style={{ fontSize: '15px', fontWeight: 600 }}>
                Polyphonic View
              </span>
            </div>
            <div className="h-[550px] overflow-hidden">
              <NoteDisplay pitchData={pitchData} waveformData={waveformData} />
            </div>
          </div>
        )}

        {/* PAGINA 3: TUNER */}
        {activePage === 2 && (
          <div className="h-full bg-gradient-to-br from-slate-900 via-purple-950 to-blue-950">
            <div className="h-[50px] px-4 bg-gradient-to-r from-emerald-900/30 via-teal-900/30 to-cyan-900/30 border-b border-emerald-500/30 flex items-center gap-3">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 tracking-wide" style={{ fontSize: '15px', fontWeight: 600 }}>
                Precision Tuner
              </span>
            </div>
            <div className="h-[550px] overflow-hidden">
              <TuningIndicator pitchData={pitchData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}