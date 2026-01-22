import { useEffect, useRef, useState } from 'react';

export interface PitchData {
  frequency: number;
  note: string;
  octave: number;
  cents: number;
  magnitude?: number;
}

export interface NoteWaveformData {
  note: string;
  magnitudes: number[]; // Array of magnitude values over time
}

interface PitchDetectorProps {
  onPitchDetected: (pitches: PitchData[]) => void;
  onWaveformData?: (waveformData: Record<string, number[]>) => void; // New callback for waveform data
  onError?: (error: string) => void;
  isActive: boolean;
  monitorVolume?: number; // 0-1, volume for audio monitoring (pass-through)
  useDAWInput?: boolean; // NEW: If true, will process audio from DAW instead of microphone
}

const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ============================================================================
// VST3 INTEGRATION INTERFACE
// ============================================================================
// When building as VST3 with iPlug2, this interface will be used to pass
// audio buffers from the DAW to the pitch detector.
// 
// iPlug2 should call: window.processDAWAudioBuffer(leftChannel, rightChannel, sampleRate)
// where leftChannel and rightChannel are Float32Array buffers from the DAW
// ============================================================================

declare global {
  interface Window {
    processDAWAudioBuffer?: (leftChannel: Float32Array, rightChannel: Float32Array, sampleRate: number) => void;
    __pitchDetectorReady?: boolean;
  }
}

// Calculate the average magnitude for a specific note across octaves
function getMagnitudeForNote(
  frequencyData: Uint8Array,
  note: string,
  sampleRate: number,
  fftSize: number
): number {
  const binSize = sampleRate / fftSize;
  const noteIndex = noteStrings.indexOf(note);
  
  let totalMagnitude = 0;
  let count = 0;
  
  // Check octaves 1-6 for this note
  for (let octave = 1; octave <= 6; octave++) {
    const noteNumber = octave * 12 + noteIndex;
    const A4_INDEX = 57;
    const frequency = 440 * Math.pow(2, (noteNumber - A4_INDEX) / 12);
    
    // Skip if out of reasonable range
    if (frequency < 50 || frequency > 2000) continue;
    
    const binIndex = Math.round(frequency / binSize);
    
    if (binIndex >= 0 && binIndex < frequencyData.length) {
      // Average surrounding bins for smoother result
      const avg = (
        frequencyData[Math.max(0, binIndex - 1)] +
        frequencyData[binIndex] +
        frequencyData[Math.min(frequencyData.length - 1, binIndex + 1)]
      ) / 3;
      
      totalMagnitude += avg;
      count++;
    }
  }
  
  return count > 0 ? totalMagnitude / count : 0;
}

function frequencyToNote(frequency: number, magnitude?: number): PitchData {
  const A4 = 440;
  const A4_INDEX = 57; // A4 is the 57th key on a piano (starting from C0)
  
  const halfStepsFromA4 = 12 * Math.log2(frequency / A4);
  const noteIndex = Math.round(halfStepsFromA4) + A4_INDEX;
  
  const octave = Math.floor(noteIndex / 12);
  const note = noteStrings[noteIndex % 12];
  
  // Calculate cents (deviation from perfect pitch)
  const perfectFreq = A4 * Math.pow(2, (noteIndex - A4_INDEX) / 12);
  const cents = Math.floor(1200 * Math.log2(frequency / perfectFreq));
  
  return { frequency, note, octave, cents, magnitude };
}

// Polyphonic pitch detection using FFT
function detectPolyphonicPitches(
  frequencyData: Uint8Array,
  sampleRate: number
): PitchData[] {
  const fftSize = frequencyData.length * 2;
  const binSize = sampleRate / fftSize;
  const detectedPitches: PitchData[] = [];
  
  // Calculate RMS to check if there's enough signal
  let rms = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    rms += frequencyData[i] * frequencyData[i];
  }
  rms = Math.sqrt(rms / frequencyData.length);
  
  // Threshold - no signal detected
  if (rms < 30) return [];
  
  // Find peaks in the frequency spectrum
  const peaks: Array<{ frequency: number; magnitude: number }> = [];
  const minMagnitude = 80; // Minimum magnitude threshold
  const minFrequency = 50;  // Below this is noise
  const maxFrequency = 2000; // Above this is less relevant for most instruments
  
  for (let i = 5; i < frequencyData.length / 2; i++) {
    const frequency = i * binSize;
    
    // Skip out of range frequencies
    if (frequency < minFrequency || frequency > maxFrequency) continue;
    
    const magnitude = frequencyData[i];
    
    // Check if this is a local peak
    if (
      magnitude > minMagnitude &&
      magnitude > frequencyData[i - 1] &&
      magnitude > frequencyData[i + 1] &&
      magnitude > frequencyData[i - 2] &&
      magnitude > frequencyData[i + 2]
    ) {
      peaks.push({ frequency, magnitude });
    }
  }
  
  // Sort peaks by magnitude (strongest first)
  peaks.sort((a, b) => b.magnitude - a.magnitude);
  
  // Convert top peaks to notes, filtering out harmonics
  const maxPeaks = 6; // Maximum number of simultaneous notes
  const processedNotes = new Set<string>();
  
  for (const peak of peaks.slice(0, maxPeaks * 2)) {
    const pitchData = frequencyToNote(peak.frequency, peak.magnitude);
    const noteKey = `${pitchData.note}${pitchData.octave}`;
    
    // Check if this note is a harmonic of an already detected note
    let isHarmonic = false;
    for (const detected of detectedPitches) {
      const ratio = peak.frequency / detected.frequency;
      // Check if it's approximately a harmonic (2x, 3x, 4x, etc.)
      if (Math.abs(ratio - Math.round(ratio)) < 0.1 && Math.round(ratio) > 1) {
        isHarmonic = true;
        break;
      }
    }
    
    // Only add if not a harmonic and not already added
    if (!isHarmonic && !processedNotes.has(noteKey)) {
      detectedPitches.push(pitchData);
      processedNotes.add(noteKey);
      
      if (detectedPitches.length >= maxPeaks) break;
    }
  }
  
  return detectedPitches;
}

export function PitchDetector({ onPitchDetected, onWaveformData, onError, isActive, monitorVolume, useDAWInput }: PitchDetectorProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null); // For DAW input processing
  const rafIdRef = useRef<number | null>(null);
  
  // Store waveform history for each note (120 samples = ~2 seconds at 60fps)
  const waveformHistoryRef = useRef<Record<string, number[]>>(
    noteStrings.reduce((acc, note) => {
      acc[note] = new Array(120).fill(0);
      return acc;
    }, {} as Record<string, number[]>)
  );

  // ============================================================================
  // DAW INPUT MODE: Setup AudioContext that receives external buffers
  // ============================================================================
  useEffect(() => {
    if (!isActive || !useDAWInput) return;

    // Setup AudioContext for DAW input mode
    const setupDAWInput = async () => {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 }); // Common DAW sample rate
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 8192;
        analyserRef.current.smoothingTimeConstant = 0.3;

        // Create a ScriptProcessorNode to receive external audio buffers
        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 2, 2);
        scriptProcessorRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);

        // Expose global function for iPlug2 to send audio buffers
        window.processDAWAudioBuffer = (leftChannel: Float32Array, rightChannel: Float32Array, sampleRate: number) => {
          if (!scriptProcessorRef.current || !audioContextRef.current) return;

          // If sample rate changed, recreate AudioContext
          if (audioContextRef.current.sampleRate !== sampleRate) {
            audioContextRef.current.close();
            audioContextRef.current = new AudioContext({ sampleRate });
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 8192;
            analyserRef.current.smoothingTimeConstant = 0.3;
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 2, 2);
            scriptProcessorRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
          }

          // Process the audio buffer through the analyser
          const event = { inputBuffer: { getChannelData: (channel: number) => channel === 0 ? leftChannel : rightChannel } };
          scriptProcessorRef.current.onaudioprocess = (e) => {
            const inputL = e.inputBuffer.getChannelData(0);
            const inputR = e.inputBuffer.getChannelData(1);
            const outputL = e.outputBuffer.getChannelData(0);
            const outputR = e.outputBuffer.getChannelData(1);
            
            // Copy input to output (passthrough)
            outputL.set(inputL);
            outputR.set(inputR);
          };
        };

        window.__pitchDetectorReady = true;
        console.log('[VST3 Mode] Pitch detector ready for DAW input');

        // Start pitch detection loop
        detectPitchDAW();
      } catch (error) {
        console.error('[VST3 Mode] Error setting up DAW input:', error);
        onError?.('Failed to initialize DAW audio input mode');
      }
    };

    setupDAWInput();

    return () => {
      window.processDAWAudioBuffer = undefined;
      window.__pitchDetectorReady = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isActive, useDAWInput, onError]);

  // Pitch detection loop for DAW input mode
  function detectPitchDAW() {
    if (!analyserRef.current || !audioContextRef.current || !useDAWInput) return;
    
    const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(frequencyData);
    
    const pitches = detectPolyphonicPitches(
      frequencyData,
      audioContextRef.current.sampleRate
    );
    
    onPitchDetected(pitches);
    
    // Calculate and update waveform data for each note
    if (onWaveformData) {
      const fftSize = analyserRef.current.fftSize;
      const sampleRate = audioContextRef.current.sampleRate;
      
      noteStrings.forEach(note => {
        const magnitude = getMagnitudeForNote(frequencyData, note, sampleRate, fftSize);
        
        // Shift history and add new value
        const history = waveformHistoryRef.current[note];
        history.shift();
        history.push(magnitude);
      });
      
      onWaveformData(waveformHistoryRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(detectPitchDAW);
  }

  // ============================================================================
  // MICROPHONE INPUT MODE: Original implementation for browser testing
  // ============================================================================
  useEffect(() => {
    if (!isActive || useDAWInput) return; // Skip if using DAW input

    async function setupAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 8192;
        analyserRef.current.smoothingTimeConstant = 0.3;
        
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
        
        // Add audio monitoring if monitorVolume is set
        if (monitorVolume !== undefined && monitorVolume > 0) {
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = monitorVolume;
          sourceRef.current.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
        }
        
        detectPitch();
      } catch (error) {
        console.error('Error accessing microphone:', error);
        
        if (error instanceof DOMException) {
          if (error.name === 'NotAllowedError') {
            onError?.('Microphone access denied. Please allow microphone access in your browser settings.');
          } else if (error.name === 'NotFoundError') {
            onError?.('No microphone found. Please connect a microphone and try again.');
          } else {
            onError?.(`Microphone error: ${error.message}`);
          }
        } else {
          onError?.('Failed to access microphone. Please check your browser permissions.');
        }
        
        onPitchDetected([]);
      }
    }

    function detectPitch() {
      if (!analyserRef.current || !audioContextRef.current) return;
      
      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(frequencyData);
      
      const pitches = detectPolyphonicPitches(
        frequencyData,
        audioContextRef.current.sampleRate
      );
      
      onPitchDetected(pitches);
      
      // Calculate and update waveform data for each note
      if (onWaveformData) {
        const fftSize = analyserRef.current.fftSize;
        const sampleRate = audioContextRef.current.sampleRate;
        
        noteStrings.forEach(note => {
          const magnitude = getMagnitudeForNote(frequencyData, note, sampleRate, fftSize);
          
          // Shift history and add new value
          const history = waveformHistoryRef.current[note];
          history.shift();
          history.push(magnitude);
        });
        
        onWaveformData(waveformHistoryRef.current);
      }
      
      rafIdRef.current = requestAnimationFrame(detectPitch);
    }

    setupAudio();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isActive, onPitchDetected, onWaveformData, onError, monitorVolume]);

  return null;
}