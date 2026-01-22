# 🔬 Algorithm Specification - Pitch Detection

Documentazione tecnica completa degli algoritmi per l'implementazione in C++ (iPlug2).

## 🎯 Overview

L'applicazione usa un **algoritmo di autocorrelazione** per rilevare la frequenza fondamentale del segnale audio in ingresso, quindi converte la frequenza in nota musicale e calcola la deviazione in cents.

## 📊 Pipeline Audio

```
Audio Input (Microphone/DAW)
    ↓
Audio Buffer (Float32Array)
    ↓
RMS Check (Noise Gate)
    ↓
Autocorrelation Algorithm
    ↓
Frequency Detection (Hz)
    ↓
Frequency → Note Conversion
    ↓
Cents Calculation
    ↓
UI Update (60 FPS)
```

## 🎤 Audio Input Setup

### Web Audio API (Current)

```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: false,    // Preserva il segnale originale
    noiseSuppression: false,    // No processing
    autoGainControl: false      // No automatic volume changes
  } 
});

const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 4096;  // Buffer size per autocorrelazione

const source = audioContext.createMediaStreamSource(stream);
source.connect(analyser);
```

### iPlug2 Equivalent (C++)

```cpp
// Nel ProcessBlock
void PitchAnalyzer::ProcessBlock(sample** inputs, sample** outputs, int nFrames)
{
    // Copia input in buffer circolare
    for (int i = 0; i < nFrames; i++)
    {
        mBuffer[mBufferPos] = inputs[0][i];  // Mono input
        mBufferPos = (mBufferPos + 1) % BUFFER_SIZE;
    }
    
    // Quando buffer è pieno, esegui pitch detection
    if (mBufferPos % HOP_SIZE == 0)
    {
        float frequency = DetectPitch(mBuffer, BUFFER_SIZE, mSampleRate);
        if (frequency > 0)
        {
            PitchData data = FrequencyToNote(frequency);
            UpdateUI(data);
        }
    }
}
```

### Parametri Audio

```cpp
const int SAMPLE_RATE = 48000;      // Hz (standard DAW)
const int BUFFER_SIZE = 4096;       // Samples per analysis
const int HOP_SIZE = 512;           // Samples between analyses
const int FFT_SIZE = 4096;          // Power of 2 for efficiency

// Latenza teorica
const float LATENCY_MS = (BUFFER_SIZE / SAMPLE_RATE) * 1000;
// = (4096 / 48000) * 1000 = ~85ms
```

## 🔍 Autocorrelation Algorithm

### JavaScript Implementation (Current)

```typescript
function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;
  
  // 1. Calculate RMS (Root Mean Square) - Noise Gate
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  
  // 2. Threshold: Ignora segnali troppo deboli
  if (rms < 0.01) return -1;  // -40 dB circa
  
  // 3. Autocorrelation loop
  let lastCorrelation = 1;
  for (let offset = 1; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    
    // 3a. Calculate difference (MAD - Mean Absolute Difference)
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    
    // 3b. Normalize to 0-1 range
    correlation = 1 - (correlation / MAX_SAMPLES);
    
    // 3c. Find first peak above threshold
    if (correlation > 0.9 && correlation > lastCorrelation) {
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    }
    
    lastCorrelation = correlation;
  }
  
  // 4. Convert offset to frequency
  if (best_correlation > 0.01 && best_offset !== -1) {
    return sampleRate / best_offset;
  }
  
  return -1;  // No pitch detected
}
```

### C++ Implementation (for iPlug2)

```cpp
float AutoCorrelate(const float* buffer, int size, float sampleRate)
{
    const int MAX_SAMPLES = size / 2;
    int bestOffset = -1;
    float bestCorrelation = 0.0f;
    float rms = 0.0f;
    
    // 1. Calculate RMS
    for (int i = 0; i < size; i++)
    {
        rms += buffer[i] * buffer[i];
    }
    rms = sqrt(rms / size);
    
    // 2. Noise gate
    if (rms < 0.01f) return -1.0f;
    
    // 3. Autocorrelation
    float lastCorrelation = 1.0f;
    for (int offset = 1; offset < MAX_SAMPLES; offset++)
    {
        float correlation = 0.0f;
        
        // Mean Absolute Difference
        for (int i = 0; i < MAX_SAMPLES; i++)
        {
            correlation += fabs(buffer[i] - buffer[i + offset]);
        }
        
        // Normalize
        correlation = 1.0f - (correlation / MAX_SAMPLES);
        
        // Find peak
        if (correlation > 0.9f && correlation > lastCorrelation)
        {
            if (correlation > bestCorrelation)
            {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }
        
        lastCorrelation = correlation;
    }
    
    // 4. Calculate frequency
    if (bestCorrelation > 0.01f && bestOffset != -1)
    {
        return sampleRate / bestOffset;
    }
    
    return -1.0f;
}
```

## 🎵 Frequency to Note Conversion

### Algorithm

```typescript
function frequencyToNote(frequency: number): PitchData {
  const A4 = 440;           // A4 = 440 Hz (standard tuning)
  const A4_INDEX = 57;      // A4 è il 57° tasto del pianoforte (da C0)
  
  // 1. Calculate semitones from A4
  const halfStepsFromA4 = 12 * Math.log2(frequency / A4);
  
  // 2. Round to nearest semitone
  const noteIndex = Math.round(halfStepsFromA4) + A4_INDEX;
  
  // 3. Calculate octave and note name
  const octave = Math.floor(noteIndex / 12);
  const note = noteStrings[noteIndex % 12];
  
  // 4. Calculate cents deviation
  const perfectFreq = A4 * Math.pow(2, (noteIndex - A4_INDEX) / 12);
  const cents = Math.floor(1200 * Math.log2(frequency / perfectFreq));
  
  return { frequency, note, octave, cents };
}
```

### Formula Matematica

#### **Semitoni da A4:**
```
n = 12 × log₂(f / 440)
```
Dove:
- `f` = frequenza rilevata (Hz)
- `440` = frequenza di A4 (standard)
- `n` = numero di semitoni da A4

#### **Frequenza perfetta di una nota:**
```
f_perfect = 440 × 2^(n/12)
```
Dove:
- `n` = semitoni da A4
- `f_perfect` = frequenza teorica della nota

#### **Cents (deviazione):**
```
cents = 1200 × log₂(f_actual / f_perfect)
```
Dove:
- `f_actual` = frequenza realmente misurata
- `f_perfect` = frequenza teorica della nota
- `cents` = deviazione in centesimi di semitono

### Note Strings Array

```typescript
const noteStrings = [
  'C',   // 0
  'C#',  // 1
  'D',   // 2
  'D#',  // 3
  'E',   // 4
  'F',   // 5
  'F#',  // 6
  'G',   // 7
  'G#',  // 8
  'A',   // 9
  'A#',  // 10
  'B'    // 11
];
```

### Octave Mapping

```
Piano Key Index → Octave
0-11    → Octave 0 (C0-B0)
12-23   → Octave 1 (C1-B1)
24-35   → Octave 2 (C2-B2)
...
48-59   → Octave 4 (C4-B4)  ← Middle C = C4
60-71   → Octave 5 (C5-B5)
...
```

### C++ Implementation

```cpp
struct PitchData
{
    float frequency;
    const char* note;
    int octave;
    int cents;
};

const char* NOTE_STRINGS[] = {
    "C", "C#", "D", "D#", "E", "F", 
    "F#", "G", "G#", "A", "A#", "B"
};

PitchData FrequencyToNote(float frequency)
{
    const float A4 = 440.0f;
    const int A4_INDEX = 57;
    
    // Calculate semitones from A4
    float halfStepsFromA4 = 12.0f * log2f(frequency / A4);
    int noteIndex = (int)roundf(halfStepsFromA4) + A4_INDEX;
    
    // Calculate octave and note
    int octave = noteIndex / 12;
    int noteIdx = noteIndex % 12;
    const char* note = NOTE_STRINGS[noteIdx];
    
    // Calculate cents
    float perfectFreq = A4 * powf(2.0f, (noteIndex - A4_INDEX) / 12.0f);
    int cents = (int)floorf(1200.0f * log2f(frequency / perfectFreq));
    
    return { frequency, note, octave, cents };
}
```

## 📊 Cents Calculation Details

### Cosa sono i Cents?

- **1 semitono = 100 cents**
- **1 ottava = 1200 cents**
- Range tipico per tuning: **±50 cents** (mezzo semitono)

### Interpretazione

```
cents = 0    → Perfettamente intonato
cents = +50  → Mezzo semitono sopra (quasi la nota successiva)
cents = -50  → Mezzo semitono sotto (quasi la nota precedente)
cents = +100 → Un semitono sopra (nota sbagliata!)
```

### Colore basato sui Cents

```cpp
Color GetCentsColor(int cents)
{
    int absCents = abs(cents);
    
    if (absCents <= 5)
        return COLOR_EMERALD;  // Perfetto (0-5 cents)
    else if (absCents <= 15)
        return COLOR_AMBER;    // Quasi (5-15 cents)
    else
        return COLOR_RED;      // Stono (>15 cents)
}
```

## 🎯 Tuning Needle Position

### Calcolo Posizione

```typescript
// Range: -50 a +50 cents
// Output: 5% a 95% (lascia margine 5% per lato)

function calculateNeedlePosition(cents: number): number {
  // Normalizza cents a percentuale
  const normalized = cents / 50;  // -1 a +1
  
  // Converti a posizione pixel/percentuale
  const position = 50 + (normalized * 45);  // 5% a 95%
  
  // Clamp ai limiti
  return Math.max(5, Math.min(95, position));
}
```

### Esempi

```
cents = -50 → position = 5%   (estrema sinistra)
cents = -25 → position = 27.5%
cents = 0   → position = 50%  (centro)
cents = +25 → position = 72.5%
cents = +50 → position = 95%  (estrema destra)
```

### C++ Implementation

```cpp
float CalculateNeedlePosition(int cents, float meterWidth)
{
    // Normalizza cents (-50 a +50 → -1 a +1)
    float normalized = cents / 50.0f;
    
    // Calcola posizione (5% margine per lato)
    float position = 0.5f + (normalized * 0.45f);
    
    // Clamp
    position = fmax(0.05f, fmin(0.95f, position));
    
    // Converti a pixel
    return position * meterWidth;
}
```

## 🔧 Optimization Tips

### 1. Buffer Size Trade-offs

```cpp
// Piccolo buffer (1024 samples)
+ Latenza bassa (~21ms @ 48kHz)
- Meno accurato per note basse (<100Hz)

// Grande buffer (8192 samples)
+ Più accurato per tutte le frequenze
- Latenza alta (~170ms @ 48kHz)

// Ottimale: 4096 samples
= Buon compromesso (~85ms @ 48kHz)
```

### 2. Frequency Range

```typescript
// Filtra frequenze fuori range musicale
if (frequency < 50 || frequency > 4000) {
  return null;  // Ignora
}

// Range musicale tipico:
// - Basso: E1 = 41 Hz
// - Chitarra: E2 = 82 Hz
// - Voce: C3-C6 = 130-1046 Hz
// - Soprano: up to C7 = 2093 Hz
```

### 3. RMS Threshold

```cpp
// Threshold dinamico basato su SNR
const float NOISE_FLOOR = 0.001f;   // -60 dB
const float SIGNAL_THRESHOLD = 0.01f;  // -40 dB

if (rms < SIGNAL_THRESHOLD)
    return -1.0f;  // No signal
```

### 4. Smoothing

```cpp
// Moving average per ridurre jitter
class FrequencySmoothing
{
    float mHistory[SMOOTHING_SIZE];
    int mIndex = 0;
    
    float Smooth(float newFreq)
    {
        mHistory[mIndex] = newFreq;
        mIndex = (mIndex + 1) % SMOOTHING_SIZE;
        
        float sum = 0.0f;
        for (int i = 0; i < SMOOTHING_SIZE; i++)
            sum += mHistory[i];
        
        return sum / SMOOTHING_SIZE;
    }
};
```

## 🎼 Reference Frequencies

### Standard Tuning (A4 = 440 Hz)

```cpp
const float REFERENCE_FREQUENCIES[] = {
    // Octave 4 (Middle octave)
    261.63f,  // C4
    277.18f,  // C#4
    293.66f,  // D4
    311.13f,  // D#4
    329.63f,  // E4
    349.23f,  // F4
    369.99f,  // F#4
    392.00f,  // G4
    415.30f,  // G#4
    440.00f,  // A4 ← Reference
    466.16f,  // A#4
    493.88f   // B4
};
```

### Alternative Tunings

```cpp
// 442 Hz tuning (orchestre europee)
const float A4_442 = 442.0f;

// 432 Hz tuning ("natural tuning")
const float A4_432 = 432.0f;

// Baroque pitch (415 Hz)
const float A4_415 = 415.0f;
```

## 🧪 Testing & Validation

### Test Frequencies

```cpp
// Test con toni puri
TestPitchDetection(440.0f);   // A4 → dovrebbe ritornare A4, 0 cents
TestPitchDetection(220.0f);   // A3 → dovrebbe ritornare A3, 0 cents
TestPitchDetection(880.0f);   // A5 → dovrebbe ritornare A5, 0 cents

// Test con deviazioni
TestPitchDetection(445.0f);   // A4 + ~20 cents
TestPitchDetection(435.0f);   // A4 - ~20 cents

// Test edge cases
TestPitchDetection(50.0f);    // Too low
TestPitchDetection(5000.0f);  // Too high
```

### Accuracy Expectations

```
Frequenza  | Cents Accuracy | Note Accuracy
-----------|----------------|---------------
> 200 Hz   | ± 5 cents      | 100%
100-200 Hz | ± 10 cents     | 99%
< 100 Hz   | ± 20 cents     | 95%
```

## 🔄 Update Rate

### Web Implementation

```typescript
// requestAnimationFrame → ~60 FPS
function detectPitch() {
  const frequency = autoCorrelate(buffer, sampleRate);
  if (frequency > 0) {
    onPitchDetected(frequencyToNote(frequency));
  }
  requestAnimationFrame(detectPitch);
}
```

### iPlug2 Implementation

```cpp
// Timer per UI update (non nel audio thread!)
class PitchAnalyzer : public IPlug
{
    ITimerPtr mUITimer;
    
    void OnInit()
    {
        // Update UI @ 60 FPS
        mUITimer = Timer::Create([this]() {
            if (mPitchData.isValid)
            {
                UpdateUIControls(mPitchData);
            }
        }, 16);  // 16ms = ~60 FPS
    }
};
```

## 📈 Performance Metrics

### Web Audio API
```
CPU: 5-10% (single core)
RAM: 50-80 MB
Latency: 30-100ms (input → display)
Update rate: 60 FPS
```

### iPlug2 Target
```
CPU: <1% (optimized C++)
RAM: <10 MB
Latency: <10ms (input → display)
Update rate: 60 FPS
```

---

**Questa specifica è completa e pronta per l'implementazione in C++!** 🚀

## 📚 Risorse Aggiuntive

- [McLeod Pitch Method (MPM)](https://github.com/sevagh/pitch-detection) - Algoritmo alternativo più accurato
- [Yin Algorithm](https://audacity.github.io/libnyquist/yin_8h_source.html) - Altra opzione popolare
- [JUCE DSP Module](https://docs.juce.com/master/group__juce__dsp.html) - Librerie DSP per JUCE
- [iPlug2 Examples](https://github.com/iPlug2/iPlug2) - Esempi di plugin audio
