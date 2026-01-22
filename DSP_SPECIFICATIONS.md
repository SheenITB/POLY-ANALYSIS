# 🎛️ DSP Specifications - Poly Analysis VST3

## 📋 Panoramica

Questo documento descrive **esattamente** cosa fa il plugin Poly Analysis e quali sono le specifiche tecniche che il DSP in C++ dovrà implementare per la versione VST3 con iPlug2.

---

## 🎯 Cosa Fa il Plugin

**Poly Analysis** è un **analizzatore polifonico di pitch in tempo reale** che:

1. ✅ Riceve audio dalla DAW (stereo)
2. ✅ Esegue FFT (Fast Fourier Transform) per analisi spettrale
3. ✅ Rileva fino a **6 note simultanee** con algoritmo peak detection
4. ✅ Filtra armoniche per evitare false detection
5. ✅ Calcola frequenza, nota, ottava e **cents** (deviazione intonazione)
6. ✅ Genera waveform history per visualizzazione (120 samples @ 60fps)
7. ✅ Passa l'audio in uscita senza modifiche (pass-through)

---

## 🔧 Specifiche Tecniche Audio

### **Parametri Audio Principali**

```cpp
// FFT Configuration
constexpr int FFT_SIZE = 8192;           // Dimensione FFT
constexpr int FREQUENCY_BIN_COUNT = 4096; // FFT_SIZE / 2

// Sample Rate
constexpr double DEFAULT_SAMPLE_RATE = 48000.0; // Hz (common in DAWs)
// Supporta anche: 44100, 88200, 96000 Hz

// Buffer Size
constexpr int BUFFER_SIZE = 4096;        // Samples per block (tipico in DAW)

// Analysis Parameters
constexpr int MAX_POLYPHONY = 6;         // Numero massimo di note simultanee
constexpr double MIN_FREQUENCY = 50.0;   // Hz - sotto è rumore
constexpr double MAX_FREQUENCY = 2000.0; // Hz - sopra è meno rilevante
constexpr int MIN_MAGNITUDE = 80;        // Soglia minima FFT (0-255)
constexpr int RMS_THRESHOLD = 30;        // Soglia RMS per rilevare segnale

// GUI Update Rate
constexpr int GUI_FPS = 60;              // Frame per secondo
constexpr int WAVEFORM_HISTORY_SIZE = 120; // Samples per waveform (2 sec @ 60fps)
```

### **Canali Audio**

```cpp
#define PLUG_CHANNEL_IO "1-1 2-2"  // Supporta Mono e Stereo

// Input:  Left + Right (stereo) oppure Mono
// Output: Left + Right (stereo) oppure Mono - PASS-THROUGH
```

---

## 🧮 Algoritmo di Pitch Detection

### **Step 1: FFT Analysis**

```cpp
// Pseudo-codice C++
void ProcessBlock(sample** inputs, sample** outputs, int nFrames)
{
    // 1. Pass-through audio (IMPORTANTE!)
    for (int s = 0; s < nFrames; s++) {
        outputs[0][s] = inputs[0][s]; // Left
        outputs[1][s] = inputs[1][s]; // Right
    }
    
    // 2. Copia samples in FFT buffer (usa canale sinistro o mix)
    CopyToFFTBuffer(inputs[0], nFrames);
    
    // 3. Esegui FFT (8192 punti)
    PerformFFT(mFFTBuffer, FFT_SIZE);
    
    // 4. Converti in magnitude spectrum (0-255)
    Uint8Array frequencyData = GetByteFrequencyData();
    
    // 5. Rileva pitch polifonici
    std::vector<PitchData> pitches = DetectPolyphonicPitches(frequencyData);
    
    // 6. Invia dati alla GUI
    SendToGUI(pitches);
}
```

### **Step 2: Peak Detection**

```javascript
// Algoritmo (dal codice JavaScript - da portare in C++)
function detectPolyphonicPitches(frequencyData, sampleRate) {
    const fftSize = frequencyData.length * 2; // 8192
    const binSize = sampleRate / fftSize;     // es. 48000 / 8192 = 5.86 Hz per bin
    
    // 1. Calcola RMS per verificare presenza segnale
    let rms = 0;
    for (let i = 0; i < frequencyData.length; i++) {
        rms += frequencyData[i] * frequencyData[i];
    }
    rms = Math.sqrt(rms / frequencyData.length);
    
    // Se RMS < 30, nessun segnale → return []
    if (rms < 30) return [];
    
    // 2. Trova picchi locali nello spettro
    const peaks = [];
    for (let i = 5; i < frequencyData.length / 2; i++) {
        const frequency = i * binSize;
        
        // Filtra frequenze fuori range
        if (frequency < 50 || frequency > 2000) continue;
        
        const magnitude = frequencyData[i];
        
        // Picco locale: più alto dei 4 bin vicini (±2)
        if (magnitude > 80 &&
            magnitude > frequencyData[i-1] &&
            magnitude > frequencyData[i+1] &&
            magnitude > frequencyData[i-2] &&
            magnitude > frequencyData[i+2]) {
            
            peaks.push({ frequency, magnitude });
        }
    }
    
    // 3. Ordina per magnitude (più forte prima)
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    
    // 4. Converti in note, filtra armoniche
    const detectedPitches = [];
    const processedNotes = new Set();
    
    for (const peak of peaks.slice(0, 12)) { // Considera top 12 peaks
        const pitchData = frequencyToNote(peak.frequency, peak.magnitude);
        const noteKey = `${pitchData.note}${pitchData.octave}`;
        
        // Controlla se è armonica di una nota già rilevata
        let isHarmonic = false;
        for (const detected of detectedPitches) {
            const ratio = peak.frequency / detected.frequency;
            // Se ratio ≈ 2, 3, 4, ... è un'armonica
            if (Math.abs(ratio - Math.round(ratio)) < 0.1 && Math.round(ratio) > 1) {
                isHarmonic = true;
                break;
            }
        }
        
        // Aggiungi solo se NON è armonica e NON già aggiunta
        if (!isHarmonic && !processedNotes.has(noteKey)) {
            detectedPitches.push(pitchData);
            processedNotes.add(noteKey);
            
            if (detectedPitches.length >= 6) break; // Massimo 6 note
        }
    }
    
    return detectedPitches;
}
```

### **Step 3: Frequency to Note Conversion**

```javascript
// Conversione frequenza → nota musicale
function frequencyToNote(frequency, magnitude) {
    const A4 = 440.0;        // La4 = 440 Hz (standard)
    const A4_INDEX = 57;     // La4 è il 57° tasto del pianoforte (da C0)
    
    // 1. Calcola semitoni da A4
    const halfStepsFromA4 = 12 * Math.log2(frequency / A4);
    const noteIndex = Math.round(halfStepsFromA4) + A4_INDEX;
    
    // 2. Estrai ottava e nota
    const octave = Math.floor(noteIndex / 12);
    const note = noteStrings[noteIndex % 12]; // 'C', 'C#', 'D', ...
    
    // 3. Calcola cents (deviazione dalla frequenza perfetta)
    const perfectFreq = A4 * Math.pow(2, (noteIndex - A4_INDEX) / 12);
    const cents = Math.floor(1200 * Math.log2(frequency / perfectFreq));
    
    return { 
        frequency,  // Hz (float)
        note,       // 'C', 'C#', 'D', etc.
        octave,     // 0-8
        cents,      // -50 a +50 (deviazione in cents)
        magnitude   // 0-255 (intensità FFT)
    };
}

// Array delle 12 note cromatiche
const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
```

---

## 📊 Struttura Dati Output

### **PitchData** (inviato alla GUI)

```typescript
interface PitchData {
    frequency: number;  // Frequenza rilevata in Hz (es. 440.0)
    note: string;       // Nota musicale ('C', 'C#', 'D', ...)
    octave: number;     // Ottava (0-8, tipicamente 2-5)
    cents: number;      // Deviazione in cents (-50 a +50)
    magnitude?: number; // Intensità del picco FFT (0-255)
}

// Esempio output per accordo di C Major:
[
    { frequency: 261.63, note: 'C', octave: 4, cents: 0, magnitude: 180 },
    { frequency: 329.63, note: 'E', octave: 4, cents: -5, magnitude: 165 },
    { frequency: 392.00, note: 'G', octave: 4, cents: 3, magnitude: 150 }
]
```

### **Waveform Data** (per visualizzazione)

```typescript
// Waveform history per ogni nota (12 note × 120 samples)
type WaveformData = Record<string, number[]>;

// Esempio:
{
    'C':  [0, 0, 15, 45, 80, 120, 150, 180, 165, ...], // 120 values
    'C#': [0, 0, 0, 0, 0, 0, 0, 0, 0, ...],
    'D':  [0, 0, 10, 25, 50, 75, 90, 110, 105, ...],
    // ... altre 9 note
}

// Ogni array ha 120 valori (0-255) che rappresentano la magnitude
// nel tempo → usato per disegnare waveform animata nella GUI
```

---

## 🔌 Interfaccia C++ ↔ JavaScript

### **Da C++ a JavaScript** (invio dati pitch)

```cpp
// In C++ (iPlug2)
void SendPitchDataToGUI(const std::vector<PitchData>& pitches) {
    // Costruisci JSON
    WDL_String json;
    json.Append("[");
    
    for (size_t i = 0; i < pitches.size(); i++) {
        json.AppendFormatted(256,
            "{\"frequency\":%.2f,\"note\":\"%s\",\"octave\":%d,\"cents\":%d,\"magnitude\":%d}",
            pitches[i].frequency,
            pitches[i].note.c_str(),
            pitches[i].octave,
            pitches[i].cents,
            pitches[i].magnitude
        );
        if (i < pitches.size() - 1) json.Append(",");
    }
    
    json.Append("]");
    
    // Invia alla GUI
    mpWebView->EvaluateJavaScript(
        WDL_String().SetFormatted(512,
            "if (window.__onPitchDetected) { window.__onPitchDetected(%s); }",
            json.Get()
        )
    );
}
```

### **Da JavaScript a C++** (opzionale - controlli GUI)

```javascript
// In JavaScript (React)
window.sendToPlugin = function(data) {
    if (window.iplug) {
        window.iplug.postMessage(JSON.stringify(data));
    }
};

// Esempio: invio comando al plugin
window.sendToPlugin({ 
    command: 'setParameter', 
    param: 'gain', 
    value: 0.8 
});
```

---

## 🎨 Calcolo Waveform per Visualizzazione

```javascript
// Funzione per calcolare magnitude di una nota specifica
function getMagnitudeForNote(frequencyData, note, sampleRate, fftSize) {
    const binSize = sampleRate / fftSize; // Hz per bin
    const noteIndex = noteStrings.indexOf(note); // 0-11
    
    let totalMagnitude = 0;
    let count = 0;
    
    // Controlla ottave 1-6 per questa nota
    for (let octave = 1; octave <= 6; octave++) {
        const noteNumber = octave * 12 + noteIndex;
        const A4_INDEX = 57;
        const frequency = 440 * Math.pow(2, (noteNumber - A4_INDEX) / 12);
        
        // Salta se fuori range ragionevole
        if (frequency < 50 || frequency > 2000) continue;
        
        const binIndex = Math.round(frequency / binSize);
        
        if (binIndex >= 0 && binIndex < frequencyData.length) {
            // Media di 3 bin per smoothing
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

// Aggiorna waveform history (chiamato a 60fps)
noteStrings.forEach(note => {
    const magnitude = getMagnitudeForNote(frequencyData, note, sampleRate, fftSize);
    
    // Shift array e aggiungi nuovo valore
    waveformHistory[note].shift();       // Rimuovi il primo elemento
    waveformHistory[note].push(magnitude); // Aggiungi il nuovo alla fine
});
```

---

## ⚙️ Requisiti Performance DSP

### **CPU Usage Target**

```
Latency:        < 5ms (VST3 mode)
CPU Usage:      < 10% (single core @ 3GHz)
Memory:         < 50MB
Update Rate:    60 FPS per GUI
```

### **Ottimizzazioni Consigliate**

1. **FFT Efficiente**: Usa libreria ottimizzata (FFTW, vDSP su Mac, IPP)
2. **Circular Buffer**: Per gestire FFT su stream audio continuo
3. **Peak Detection Cache**: Evita ricalcoli inutili
4. **GUI Throttling**: Invia dati GUI max 60 volte/sec (non ogni buffer)
5. **SIMD**: Usa operazioni vettoriali per magnitude calculation

```cpp
// Esempio ottimizzazione: invia GUI solo ogni N frames
static int guiFrameCounter = 0;
constexpr int GUI_UPDATE_INTERVAL = 4; // ~60fps @ 256 buffer size

if (++guiFrameCounter >= GUI_UPDATE_INTERVAL) {
    SendPitchDataToGUI(pitches);
    guiFrameCounter = 0;
}
```

---

## 🧪 Test Cases Attesi

### **Test 1: Nota Singola**

```
Input:  Sinewave @ 440 Hz (A4)
Output: [{ frequency: 440.0, note: 'A', octave: 4, cents: 0 }]
```

### **Test 2: Accordo Maggiore (3 note)**

```
Input:  C Major chord (C4 + E4 + G4)
Output: [
    { frequency: 261.63, note: 'C', octave: 4, cents: 0 },
    { frequency: 329.63, note: 'E', octave: 4, cents: 0 },
    { frequency: 392.00, note: 'G', octave: 4, cents: 0 }
]
```

### **Test 3: Stonatura**

```
Input:  Sinewave @ 442 Hz (A4 crescente)
Output: [{ frequency: 442.0, note: 'A', octave: 4, cents: +8 }]
```

### **Test 4: Rumore/Silenzio**

```
Input:  White noise o silenzio (RMS < 30)
Output: []  // Array vuoto
```

### **Test 5: Armoniche (Filtering)**

```
Input:  Fundamental @ 100 Hz + Harmonics @ 200, 300, 400 Hz
Output: [{ frequency: 100.0, note: 'G', octave: 2, cents: 0 }]
// Le armoniche NON devono essere rilevate come note separate
```

---

## 📐 Formula Matematiche Chiave

### **1. Frequenza → Semitoni da A4**

```
halfSteps = 12 × log₂(frequency / 440)
```

### **2. Semitoni → Nota e Ottava**

```
noteIndex = round(halfSteps) + 57
octave = floor(noteIndex / 12)
notePosition = noteIndex mod 12
```

### **3. Calcolo Cents**

```
cents = 1200 × log₂(frequency / perfectFrequency)
```

Dove:
- `perfectFrequency = 440 × 2^((noteIndex - 57) / 12)`

### **4. FFT Bin → Frequenza**

```
frequency = binIndex × (sampleRate / fftSize)
```

Esempio con SR=48000, FFT=8192:
- Bin 0 = 0 Hz
- Bin 1 = 5.86 Hz
- Bin 100 = 586 Hz

### **5. RMS Calculation**

```
RMS = sqrt( (Σ x[i]²) / N )
```

---

## 🎛️ Parametri Plugin VST3

### **Parametri Esposti alla DAW** (opzionali)

```cpp
enum EParams {
    kParamBypass = 0,       // 0/1 - Bypass plugin
    kParamSensitivity,      // 0.0-1.0 - Soglia detection
    kParamMinFreq,          // 50-500 Hz - Frequenza minima
    kParamMaxFreq,          // 500-2000 Hz - Frequenza massima
    kNumParams
};
```

**NOTA**: Attualmente il plugin NON ha parametri esposti (è solo analyzer), ma puoi aggiungerne se necessario.

---

## 🔄 Flusso Dati Completo

```
┌─────────────────────────────────────────────────────────────┐
│                         DAW TRACK                            │
│                    (Logic/Reaper/FL)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Audio Buffer (512 samples @ 48kHz)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  VST3 PLUGIN (C++)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ProcessBlock(inputs, outputs, nFrames)             │   │
│  │  1. Pass-through: outputs = inputs                  │   │
│  │  2. Copy to FFT buffer (8192 samples)              │   │
│  │  3. Perform FFT                                     │   │
│  │  4. Get byte frequency data (Uint8Array[4096])     │   │
│  │  5. Detect polyphonic pitches (max 6 notes)        │   │
│  │  6. Filter harmonics                               │   │
│  │  7. Calculate waveform magnitudes (12 notes)       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────┬──────────────────┬─────────────────────┘
                     │                  │
                     │ JSON Data        │ Audio Pass-through
                     ↓                  ↓
          ┌──────────────────┐   ┌─────────────────┐
          │   WebView GUI    │   │   DAW Output    │
          │  (React/Vite)    │   └─────────────────┘
          │  ┌────────────┐  │
          │  │ Pitch Data │  │ ← window.__onPitchDetected(pitches)
          │  │ Display    │  │
          │  ├────────────┤  │
          │  │ Waveform   │  │ ← window.__onWaveformData(waveforms)
          │  │ Visualizer │  │
          │  ├────────────┤  │
          │  │ Tuning     │  │
          │  │ Indicator  │  │
          │  └────────────┘  │
          └──────────────────┘
```

---

## ✅ Checklist Implementazione DSP

### **Core DSP**
- [ ] FFT Engine (8192 punti, libreria ottimizzata)
- [ ] Circular buffer per audio input
- [ ] Byte frequency data conversion (0-255 magnitude)
- [ ] RMS calculation per threshold detection
- [ ] Peak detection algorithm (local maxima)
- [ ] Harmonic filtering (ratio-based)
- [ ] Frequency to note conversion
- [ ] Cents calculation

### **Comunicazione GUI**
- [ ] JSON serialization per PitchData array
- [ ] Waveform magnitude calculation (12 note × 120 samples)
- [ ] EvaluateJavaScript per inviare dati
- [ ] Throttling GUI updates (max 60fps)

### **Performance**
- [ ] Audio pass-through zero-latency
- [ ] SIMD optimization per FFT
- [ ] Memory pool per evitare allocazioni
- [ ] Profiling CPU usage (target < 10%)

### **Testing**
- [ ] Test con sinewaves pure (440 Hz, 262 Hz, etc.)
- [ ] Test accordi maggiori/minori
- [ ] Test stonatura (±50 cents)
- [ ] Test rumore bianco (no false positives)
- [ ] Test armoniche (filtering corretto)
- [ ] Stress test (6 note simultanee)

---

## 📚 Risorse Tecniche

### **Librerie FFT Consigliate**

| Libreria | Platform | Performance | License |
|----------|----------|-------------|---------|
| **vDSP** | macOS/iOS | ⭐⭐⭐⭐⭐ | Free (Apple) |
| **FFTW** | Cross-platform | ⭐⭐⭐⭐ | GPL/Commercial |
| **Intel IPP** | x86/x64 | ⭐⭐⭐⭐⭐ | Commercial |
| **KissFFT** | Cross-platform | ⭐⭐⭐ | BSD (simple) |

### **Formula Reference**

- [MIDI Note to Frequency](https://newt.phys.unsw.edu.au/jw/notes.html)
- [Cents Calculation](https://en.wikipedia.org/wiki/Cent_(music))
- [FFT Tutorial](https://www.dspguide.com/)

---

## 🎉 Risultato Finale

Quando tutto è implementato correttamente, il DSP C++ dovrà:

1. ✅ Processare audio a latenza < 5ms
2. ✅ Rilevare fino a 6 note simultanee con precisione ±1 cent
3. ✅ Filtrare correttamente armoniche e rumori
4. ✅ Aggiornare GUI fluida a 60fps
5. ✅ Consumare < 10% CPU su un core moderno
6. ✅ Pass-through audio senza modifiche
7. ✅ Funzionare in qualsiasi DAW VST3-compatibile

**Il risultato sarà un plugin VST3 professionale per analisi polifonica del pitch in tempo reale!** 🎵✨

---

**Versione documento**: 1.0  
**Data**: Gennaio 2025  
**Autore**: Analisi automatica del codice sorgente
