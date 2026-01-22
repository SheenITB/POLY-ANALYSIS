# Guida Completa: Integrazione GUI Web in VST3 con iPlug2

## 📋 Panoramica del Processo

Questa guida ti accompagnerà nell'integrazione della tua GUI web di **Poly Analysis** in un plugin VST3 usando iPlug2 con WebView, permettendo build sia su Mac che su Windows.

---

## 🎯 Fase 1: Preparazione dell'Ambiente di Sviluppo

### Mac (Sistema Primario)

1. **Installa Xcode** (versione 14 o superiore)
   ```bash
   xcode-select --install
   ```

2. **Installa Homebrew** (se non già installato)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Installa CMake**
   ```bash
   brew install cmake
   ```

4. **Clona iPlug2**
   ```bash
   cd ~/Development  # o la directory che preferisci
   git clone https://github.com/iPlug2/iPlug2.git --recursive
   ```

### Windows (Build Secondario - GitHub Actions)

Configureremo GitHub Actions più avanti, ma avrai bisogno di:
- Visual Studio 2022 Community (con C++ Desktop Development)
- Windows SDK
- CMake

---

## 🏗️ Fase 2: Creazione del Progetto iPlug2

### 1. Usa il Template Duplicator di iPlug2

```bash
cd ~/Development/iPlug2
python3 duplicate.py
```

**Rispondi alle domande del wizard:**
- **Project name**: `PolyAnalysis` (senza spazi - nome classe C++)
- **Manufacturer**: `Il tuo nome/azienda`
- **Unique ID**: `Plya` (4 caratteri univoci)
- **Plugin type**: Seleziona `Effect`
- **Use WebView**: `Yes` ✅ **IMPORTANTE!**
- **Include AAX**: No (a meno che non hai iLok)
- **Include AUv3**: Optional

> **📝 NOTA NOMENCLATURA**: 
> - Usa `PolyAnalysis` (senza spazi) per nomi di classi, file e identificatori C++
> - Usa `Poly Analysis` (con spazio) solo per il nome visualizzato del plugin (PLUG_NAME)

### 2. Struttura del Progetto Creato

```
PolyAnalysis/
├── config/
│   └── PolyAnalysis-web.mk
├── resources/
│   ├── web/           # 👈 QUI andrà la tua GUI
│   ├── img/
│   └── fonts/
├── PolyAnalysis.cpp   # 👈 DSP principale
├── PolyAnalysis.h
└── projects/
    ├── PolyAnalysis-macOS.xcodeproj
    └── PolyAnalysis-win.sln
```

---

## 📦 Fase 3: Esportazione della GUI da Figma Make

### 1. Prepara il Build di Produzione

Nel tuo progetto Figma Make, assicurati che:
- Tutte le dimensioni siano fisse a **600×600px**
- Non ci siano errori di console
- `window.processDAWAudioBuffer()` sia implementato

### 2. Scarica il Progetto

Dal menu di Figma Make:
- Clicca su **"Download"** o **"Export"**
- Seleziona **"Production Build"**
- Scarica lo ZIP

### 3. Estrai i File Necessari

La build conterrà:
```
build/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [altri assets]
└── [immagini/font]
```

---

## 🔌 Fase 4: Integrazione della GUI in iPlug2

### 1. Copia i File Web

```bash
cd ~/Development/iPlug2/Examples/PolyAnalysis

# Elimina il contenuto di esempio
rm -rf resources/web/*

# Copia la tua build
cp -r ~/Downloads/figma-make-build/* resources/web/
```

### 2. Rinomina index.html (IMPORTANTE)

iPlug2 cerca `index.html` nella root di `resources/web/`:

```bash
cd resources/web
# Assicurati che index.html sia presente
ls -la index.html
```

### 3. Modifica index.html per iPlug2

Apri `resources/web/index.html` e aggiungi all'inizio del `<head>`:

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- ⚠️ IMPORTANTE: Comunicazione iPlug2 ↔ WebView -->
  <script>
    // Esponi la funzione per ricevere audio dalla DAW
    window.processDAWAudioBuffer = function(channelData, numChannels, numSamples, sampleRate) {
      // Questa funzione è già implementata nel tuo codice React
      // Verrà chiamata da iPlug2 C++
    };

    // Callback per inviare dati a iPlug2 (opzionale)
    window.sendToPlugin = function(data) {
      if (window.iplug) {
        window.iplug.postMessage(JSON.stringify(data));
      }
    };
  </script>

  <!-- I tuoi file CSS e JS generati da Vite -->
  <link rel="stylesheet" href="./assets/index-[hash].css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./assets/index-[hash].js"></script>
</body>
</html>
```

**⚠️ NOTA**: Sostituisci `[hash]` con l'hash reale dei tuoi file.

---

## 💻 Fase 5: Implementazione del DSP in C++

### 1. Apri PolyAnalysis.h

Definisci i parametri e il buffer audio:

```cpp
#pragma once

#include "IPlug_include_in_plug_hdr.h"
#include "IWebView.h"

const int kNumPresets = 1;

enum EParams
{
  kGain = 0,
  kNumParams
};

class PolyAnalysis final : public iplug::Plugin
{
public:
  PolyAnalysis(const iplug::InstanceInfo& info);

  void ProcessBlock(iplug::sample** inputs, iplug::sample** outputs, int nFrames) override;
  void OnReset() override;
  void OnParamChange(int paramIdx) override;

private:
  // Buffer circolare per inviare audio alla GUI
  static constexpr int kAudioBufferSize = 4096;
  std::vector<float> mAudioBuffer;
  int mBufferWritePos = 0;
  
  // WebView reference
  IWebView* mpWebView = nullptr;
  
  void SendAudioToGUI(iplug::sample** inputs, int nFrames, int nChans);
};
```

### 2. Apri PolyAnalysis.cpp

Implementa il DSP e la comunicazione con la GUI:

```cpp
#include "PolyAnalysis.h"
#include "IPlug_include_in_plug_src.h"
#include "IControls.h"

PolyAnalysis::PolyAnalysis(const iplug::InstanceInfo& info)
: Plugin(info, MakeConfig(kNumParams, kNumPresets))
{
  // Inizializza parametri
  GetParam(kGain)->InitDouble("Gain", 0., -70., 12.0, 0.01, "dB");

  // Inizializza il buffer audio
  mAudioBuffer.resize(kAudioBufferSize, 0.f);

#if IPLUG_EDITOR
  mMakeGraphicsFunc = [&]() {
    return MakeGraphics(*this, PLUG_WIDTH, PLUG_HEIGHT, PLUG_FPS, GetScaleForScreen(PLUG_WIDTH, PLUG_HEIGHT));
  };
  
  mLayoutFunc = [&](IGraphics* pGraphics) {
    pGraphics->AttachCornerResizer(EUIResizerMode::Scale, false);
    pGraphics->LoadFont("Roboto-Regular", ROBOTO_FN);
    
    // ⚠️ IMPORTANTE: Carica la WebView
    mpWebView = new IWebView(IRECT(0, 0, PLUG_WIDTH, PLUG_HEIGHT), "index.html");
    pGraphics->AttachControl(mpWebView);
    
    // Listener per messaggi dalla GUI (opzionale)
    mpWebView->SetWebMessageHandler([this](const char* json) {
      // Gestisci messaggi dalla GUI web
      DBGMSG("Message from GUI: %s\n", json);
    });
  };
#endif
}

void PolyAnalysis::ProcessBlock(iplug::sample** inputs, iplug::sample** outputs, int nFrames)
{
  const int nChans = NOutChansConnected();
  
  // 1. Processa l'audio (passa attraverso per ora)
  for (int s = 0; s < nFrames; s++) {
    for (int c = 0; c < nChans; c++) {
      outputs[c][s] = inputs[c][s];
    }
  }
  
  // 2. Invia audio alla GUI per l'analisi
  SendAudioToGUI(inputs, nFrames, NInChansConnected());
}

void PolyAnalysis::SendAudioToGUI(iplug::sample** inputs, int nFrames, int nChans)
{
  if (!mpWebView) return;
  
  // Converti il buffer audio in un formato JSON o binario
  // Per semplicità, usiamo JSON (puoi ottimizzare con ArrayBuffer)
  
  WDL_String json;
  json.SetFormatted(8192, "{\"type\":\"audio\",\"channels\":%d,\"samples\":%d,\"sampleRate\":%d,\"data\":[",
                    nChans, nFrames, (int)GetSampleRate());
  
  // Invia solo il primo canale per efficienza (o un mix)
  for (int s = 0; s < nFrames && s < 512; s++) { // Limita a 512 samples per performance
    if (s > 0) json.Append(",");
    json.AppendFormatted(32, "%.6f", inputs[0][s]);
  }
  json.Append("]}");
  
  // Invia alla WebView
  mpWebView->EvaluateJavaScript(WDL_String().SetFormatted(1024, 
    "if (window.processDAWAudioBuffer) { \
       const data = %s; \
       window.processDAWAudioBuffer(data.data, data.channels, data.samples, data.sampleRate); \
     }", json.Get()));
}

void PolyAnalysis::OnReset()
{
  mAudioBuffer.clear();
  mAudioBuffer.resize(kAudioBufferSize, 0.f);
  mBufferWritePos = 0;
}

void PolyAnalysis::OnParamChange(int paramIdx)
{
  // Gestisci cambiamenti di parametri
}
```

### 3. Configura config.h

Apri `config/PolyAnalysis-web.h` e imposta:

```cpp
// ============================================================================
// POLY ANALYSIS - Plugin Configuration
// ============================================================================

#define PLUG_NAME "Poly Analysis"               // ✅ Nome visualizzato (CON spazio)
#define PLUG_MFR "YourName"
#define PLUG_VERSION_HEX 0x00010000
#define PLUG_VERSION_STR "1.0.0"
#define PLUG_UNIQUE_ID 'Plya'                   // ID univoco a 4 caratteri
#define PLUG_MFR_ID 'Acme'
#define PLUG_URL_STR "https://yourwebsite.com"
#define PLUG_EMAIL_STR "your@email.com"

#define PLUG_CLASS_NAME PolyAnalysis           // ⚠️ Nome classe C++ (SENZA spazi)

#define BUNDLE_NAME "PolyAnalysis"              // Nome bundle (senza spazi)
#define BUNDLE_MFR "YourName"
#define BUNDLE_DOMAIN "com"

#define PLUG_CHANNEL_IO "1-1 2-2"               // Mono e Stereo

#define PLUG_TYPE 0                              // Effect
#define PLUG_DOES_MIDI_IN 0
#define PLUG_DOES_MIDI_OUT 0
#define PLUG_DOES_MPE 0
#define PLUG_DOES_STATE_CHUNKS 0

#define PLUG_WIDTH 600                          // ✅ Larghezza GUI fissa
#define PLUG_HEIGHT 600                         // ✅ Altezza GUI fissa
#define PLUG_FPS 60                             // Frame rate della GUI

#define SHARED_RESOURCES_SUBPATH "PolyAnalysis"

#define PLUG_HAS_UI 1
#define PLUG_WEBVIEW 1                          // ⚠️ IMPORTANTE! Abilita WebView
```

> **📝 RIEPILOGO NOMENCLATURA**:
> - **`PLUG_NAME`**: `"Poly Analysis"` (con spazio) → Nome mostrato nella DAW
> - **`PLUG_CLASS_NAME`**: `PolyAnalysis` (senza spazio) → Nome classe C++
> - **`BUNDLE_NAME`**: `"PolyAnalysis"` (senza spazio) → Nome file .vst3
> - **File sorgenti**: `PolyAnalysis.h`, `PolyAnalysis.cpp` (senza spazi)

---

## 🔨 Fase 6: Build su Mac

### 1. Apri il Progetto Xcode

```bash
cd ~/Development/iPlug2/Examples/PolyAnalysis
open projects/PolyAnalysis-macOS.xcodeproj
```

### 2. Configura il Target

- Seleziona **"APP"** come target per testare standalone
- Oppure **"VST3"** per buildare il plugin

### 3. Build & Run

- Premi **Cmd + B** per buildare
- Se hai selezionato APP, premi **Cmd + R** per eseguire

### 4. Verifica il Plugin VST3

Il file `.vst3` sarà in:
```
~/Library/Audio/Plug-Ins/VST3/PolyAnalysis.vst3
```

Copia in:
```bash
cp -r ~/Music/iPlug2Output/PolyAnalysis.vst3 ~/Library/Audio/Plug-Ins/VST3/
```

### 5. Testa in una DAW

Apri Logic Pro/Reaper e carica il plugin come effetto su una traccia audio.

---

## 🪟 Fase 7: Build per Windows con GitHub Actions

### 1. Crea .github/workflows/build.yml

Nel tuo repository GitHub:

```yaml
name: Build VST3

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-windows:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v3
      with:
        submodules: recursive
    
    - name: Add MSBuild to PATH
      uses: microsoft/setup-msbuild@v1.1
    
    - name: Build VST3
      run: |
        cd projects
        msbuild PolyAnalysis-win.sln /p:Configuration=Release /p:Platform=x64
    
    - name: Upload Artifact
      uses: actions/upload-artifact@v3
      with:
        name: PolyAnalysis-VST3-Windows
        path: build-win/VST3/Release/PolyAnalysis.vst3

  build-macos:
    runs-on: macos-latest
    
    steps:
    - uses: actions/checkout@v3
      with:
        submodules: recursive
    
    - name: Build VST3
      run: |
        cd projects
        xcodebuild -project PolyAnalysis-macOS.xcodeproj -scheme VST3 -configuration Release
    
    - name: Upload Artifact
      uses: actions/upload-artifact@v3
      with:
        name: PolyAnalysis-VST3-macOS
        path: build-mac/VST3/Release/PolyAnalysis.vst3
```

### 2. Push al Repository

```bash
git add .
git commit -m "Setup VST3 project with WebView"
git push origin main
```

GitHub Actions builderà automaticamente per entrambe le piattaforme!

---

## 🐛 Fase 8: Debugging e Troubleshooting

### Problemi Comuni

#### 1. **WebView non si carica**

**Soluzione**:
```cpp
// In PolyAnalysis.cpp, aggiungi logging
mpWebView->SetLoadHandler([](bool success) {
  DBGMSG("WebView loaded: %s\n", success ? "YES" : "NO");
});
```

#### 2. **window.processDAWAudioBuffer non viene chiamata**

**Verifica**:
- Controlla che `EvaluateJavaScript` sia chiamato
- Usa Console.log nella GUI web
- Assicurati che il formato JSON sia corretto

**Debug JavaScript**:
```javascript
// In App.tsx
useEffect(() => {
  console.log('processDAWAudioBuffer registrato:', 
    typeof window.processDAWAudioBuffer);
}, []);
```

#### 3. **Plugin crasha al caricamento**

**Controlla**:
- PLUG_WIDTH e PLUG_HEIGHT in config.h
- Tutti i file in `resources/web/` sono presenti
- I path relativi in index.html sono corretti

#### 4. **Latenza audio alta**

**Ottimizza SendAudioToGUI**:
```cpp
// Invia audio ogni N frames invece che ogni frame
if (mFrameCounter++ % 4 == 0) {
  SendAudioToGUI(inputs, nFrames, nChans);
}
```

---

## 📊 Fase 9: Ottimizzazioni di Performance

### 1. Usa ArrayBuffer invece di JSON

In C++:
```cpp
// Invia dati binari invece di JSON
std::vector<uint8_t> binaryData(nFrames * sizeof(float));
memcpy(binaryData.data(), inputs[0], nFrames * sizeof(float));
mpWebView->SendBinaryData(binaryData.data(), binaryData.size());
```

In JavaScript:
```javascript
window.processBinaryAudio = function(arrayBuffer) {
  const floatArray = new Float32Array(arrayBuffer);
  // Processa...
};
```

### 2. Riduci la Frequenza di Aggiornamento GUI

```cpp
// Aggiorna la GUI a 30fps invece di 60fps
static int frameSkip = 0;
if (++frameSkip % 2 == 0) {
  SendAudioToGUI(inputs, nFrames, nChans);
}
```

### 3. Web Worker per FFT

Nel tuo codice React, sposta la FFT in un Web Worker:

```javascript
// audio-worker.js
self.onmessage = function(e) {
  const { audioData, sampleRate } = e.data;
  const fftResult = performFFT(audioData);
  self.postMessage({ pitches: extractPitches(fftResult) });
};
```

---

## ✅ Checklist Finale

Prima di rilasciare:

- [ ] Il plugin si carica senza errori in almeno 2 DAW
- [ ] La GUI è responsive a 600×600px
- [ ] L'analisi del pitch funziona in tempo reale
- [ ] Non ci sono memory leak (usa Instruments su Mac)
- [ ] Il plugin passa la validazione VST3 (`pluginval`)
- [ ] Hai testato su Mac e Windows
- [ ] La documentazione utente è pronta
- [ ] Hai un sistema di versioning (es. git tags)

---

## 📚 Risorse Aggiuntive

- [iPlug2 Documentation](https://iplug2.github.io/)
- [VST3 SDK](https://github.com/steinbergmedia/vst3sdk)
- [WebView API Reference](https://iplug2.github.io/docs/iwebview.html)
- [pluginval - VST Validator](https://github.com/Tracktion/pluginval)

---

## 🎉 Congratulazioni!

Ora hai un workflow completo per sviluppare plugin VST3 con GUI web usando iPlug2. Buon lavoro con Poly Analysis! 🎵

---

**Versione guida**: 1.0  
**Ultimo aggiornamento**: Gennaio 2025