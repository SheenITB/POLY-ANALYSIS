import { PitchData } from './PitchDetector';
import { useEffect, useRef } from 'react';

interface NoteDisplayProps {
  pitchData: PitchData[];
  waveformData: Record<string, number[]>; // Not used anymore, but keeping for compatibility
}

const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Assign unique colors to each note (vibrant colors like PitchLab)
const noteColors = {
  'C': '#22c55e',     // green
  'C#': '#10b981',    // emerald
  'D': '#06b6d4',     // cyan
  'D#': '#0ea5e9',    // sky
  'E': '#3b82f6',     // blue
  'F': '#6366f1',     // indigo
  'F#': '#8b5cf6',    // violet
  'G': '#a855f7',     // purple
  'G#': '#d946ef',    // fuchsia
  'A': '#ec4899',     // pink
  'A#': '#f97316',    // orange
  'B': '#eab308',     // yellow
};

interface PitchPoint {
  note: string;
  cents: number;
  color: string;
  magnitude: number;
}

export function NoteDisplay({ pitchData }: NoteDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<PitchPoint[][]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas dimensions
    const width = canvas.width;
    const height = canvas.height;
    const noteHeight = height / 12; // 12 notes in chromatic scale

    // Update history buffer (keep ~3 seconds of data at 60fps = ~180 frames)
    const MAX_HISTORY = 180;
    
    function animate() {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      
      // Update at ~60fps
      if (deltaTime >= 16) {
        lastUpdateRef.current = now;
        
        // Convert current pitch data to points
        const currentPoints: PitchPoint[] = pitchData.map(pitch => ({
          note: pitch.note,
          cents: pitch.cents,
          color: noteColors[pitch.note as keyof typeof noteColors],
          magnitude: pitch.magnitude || 0
        }));

        // Add to history
        historyRef.current.push(currentPoints);
        
        // Keep only recent history
        if (historyRef.current.length > MAX_HISTORY) {
          historyRef.current.shift();
        }
      }

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw horizontal grid lines for each note (reversed: C at bottom, B at top)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      
      allNotes.slice().reverse().forEach((note, index) => {
        const y = index * noteHeight;
        
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        // Draw note labels on the left
        ctx.fillStyle = '#64748b';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note, 30, y + noteHeight / 2);
      });

      // Draw pitch history as continuous lines
      const history = historyRef.current;
      const pointsPerPixel = width / MAX_HISTORY;

      // Group points by a unique identifier (note + approximate pitch)
      // This creates continuous lines for each sustained note
      if (history.length > 0) {
        // For each frame in history
        for (let frameIdx = 0; frameIdx < history.length - 1; frameIdx++) {
          const currentFrame = history[frameIdx];
          const nextFrame = history[frameIdx + 1];
          
          const x = 60 + frameIdx * pointsPerPixel;
          const nextX = 60 + (frameIdx + 1) * pointsPerPixel;

          // Draw each pitch point in this frame
          currentFrame.forEach(point => {
            // Find corresponding point in next frame (same note, similar cents)
            const nextPoint = nextFrame.find(p => 
              p.note === point.note && Math.abs(p.cents - point.cents) < 20
            );

            if (nextPoint) {
              // Calculate Y position based on note + cents
              // C is at bottom (index 0 reversed = 11), B is at top (index 11 reversed = 0)
              const noteIndex = allNotes.indexOf(point.note);
              const reversedIndex = 11 - noteIndex;
              
              // Base Y position for the note
              const baseY = reversedIndex * noteHeight + noteHeight / 2;
              
              // Offset based on cents (-50 to +50 cents = half note up/down)
              // Positive cents = sharp = move UP (lower Y)
              // Negative cents = flat = move DOWN (higher Y)
              const centsOffset = -(point.cents / 100) * noteHeight;
              const y = baseY + centsOffset;

              const nextNoteIndex = allNotes.indexOf(nextPoint.note);
              const nextReversedIndex = 11 - nextNoteIndex;
              const nextBaseY = nextReversedIndex * noteHeight + noteHeight / 2;
              const nextCentsOffset = -(nextPoint.cents / 100) * noteHeight;
              const nextY = nextBaseY + nextCentsOffset;

              // Draw line segment
              ctx.beginPath();
              ctx.strokeStyle = point.color;
              ctx.lineWidth = 2.5;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              // Opacity based on magnitude
              const opacity = Math.min(1, point.magnitude * 1.5);
              ctx.globalAlpha = opacity;
              
              ctx.moveTo(x, y);
              ctx.lineTo(nextX, nextY);
              ctx.stroke();
              
              // Add glow effect
              ctx.shadowBlur = 8;
              ctx.shadowColor = point.color;
              ctx.stroke();
              ctx.shadowBlur = 0;
              
              ctx.globalAlpha = 1;
            } else {
              // Draw single point if no continuation
              const noteIndex = allNotes.indexOf(point.note);
              const reversedIndex = 11 - noteIndex;
              const baseY = reversedIndex * noteHeight + noteHeight / 2;
              const centsOffset = -(point.cents / 100) * noteHeight;
              const y = baseY + centsOffset;

              ctx.beginPath();
              ctx.fillStyle = point.color;
              ctx.arc(x, y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pitchData]);

  return (
    <div className="flex flex-col gap-0 bg-black overflow-hidden w-full h-full">
      <canvas
        ref={canvasRef}
        width={600}
        height={550}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}