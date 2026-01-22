# 🎹 VST3 Integration Guide - iPlug2

Questa guida ti aiuterà a convertire questa web app React in un plugin VST3 per Mac e Windows usando **iPlug2**.

---

## 📋 Prerequisiti

### Software necessario:
- **iPlug2** ([GitHub](https://github.com/iPlug2/iPlug2))
- **CMake** (3.16+)
- **Xcode** (Mac) o **Visual Studio 2019+** (Windows)
- **Node.js** e **npm** per il build della web app

---

## 🏗️ Struttura del Progetto

```
MyPitchPlugin/
├── src/
│   ├── MyPitchPlugin.h           # Header del plugin
│   ├── MyPitchPlugin.cpp         # Logica C++ del plugin
│   └── resources/
│       └── web/                  # Build della React app
│           ├── index.html
│           ├── assets/
│           └── ...
├── config.h                      # Configurazione iPlug2
└── CMakeLists.txt               # Build system
```

---

## 🚀 Step 1: Build della Web App

Prima di integrare con iPlug2, devi creare il build di produzione di questa React app:

```bash
# Dalla root del progetto React
npm run build
```

Questo genererà una cartella `dist/` con tutti i file necessari.

---

## 🔧 Step 2: Setup iPlug2

### 2.1 Creare un nuovo progetto iPlug2

```bash
cd /path/to/iPlug2
./duplicate.py MyPitchPlugin YourName
```

### 2.2 Copiare i file della web app

Copia l'intera cartella `dist/` della tua React app in:
```
MyPitchPlugin/resources/web/
```

---

## 💻 Step 3: Configurazione C++

### 3.1 File Header (`MyPitchPlugin.h`)

```cpp
#pragma once

#include "IPlug_include_in_plug_hdr.h"
#include "IWebView.h"

const int kNumPresets = 1;

enum EParams
{
  kParamGain = 0,
  kNumParams
};

class MyPitchPlugin final : public iplug::Plugin
{
public:
  MyPitchPlugin(const iplug::InstanceInfo& info);

  void ProcessBlock(iplug::sample** inputs, iplug::sample** outputs, int nFrames) override;
  void OnReset() override;
  void OnParamChange(int paramIdx) override;

private:
  void SendAudioToWebView(iplug::sample** inputs, int nFrames);
  
  iplug::IWebView* mWebView = nullptr;
  
  // FFT buffer per l'analisi
  static constexpr int kFFTSize = 8192;
  float mFFTBuffer[kFFTSize];
  int mFFTPos = 0;
};
```

### 3.2 File Implementation (`MyPitchPlugin.cpp`)

```cpp
#include "MyPitchPlugin.h"
#include "IPlug_include_in_plug_src.h"

MyPitchPlugin::MyPitchPlugin(const iplug::InstanceInfo& info)
: Plugin(info, MakeConfig(kNumParams, kNumPresets))
{
  GetParam(kParamGain)->InitDouble("Gain", 0., -70., 12.0, 0.01, "dB");

  // Setup WebView
  mMakeGraphicsFunc = [&]() {
    return MakeGraphics(*this, PLUG_WIDTH, PLUG_HEIGHT, PLUG_FPS, GetScaleForScreen(PLUG_HEIGHT));
  };
  
  mLayoutFunc = [&](iplug::igraphics::IGraphics* pGraphics) {
    // Carica la web app
    pGraphics->AttachPanelBackground(COLOR_GRAY);
    
    // IMPORTANTE: Abilita la modalità VST3 prima di caricare la web app
    pGraphics->EvaluateJavaScript("window.__VST3_MODE = true;");
    
    // Carica index.html dalla cartella resources
    const char* html = pGraphics->LoadResource("index.html", "web");
    mWebView = new iplug::IWebView(pGraphics, html);
    pGraphics->AttachControl(mWebView);
    
    // Attendi che l'app sia pronta
    pGraphics->EvaluateJavaScript("console.log('VST3 Plugin loaded!');");
  };
}

void MyPitchPlugin::ProcessBlock(iplug::sample** inputs, iplug::sample** outputs, int nFrames)
{
  // Pass-through audio (importante per DAW routing)
  for (int s = 0; s < nFrames; s++) {
    outputs[0][s] = inputs[0][s]; // Left
    outputs[1][s] = inputs[1][s]; // Right
  }
  
  // Invia audio buffers alla web app per l'analisi
  SendAudioToWebView(inputs, nFrames);
}

void MyPitchPlugin::SendAudioToWebView(iplug::sample** inputs, int nFrames)
{
  if (!mWebView) return;
  
  // Converti i buffer audio in Float32Array JavaScript
  iplug::WDL_String jsCode;
  
  // Crea array JavaScript per left e right channel
  jsCode.AppendFormatted(4096, 
    "if (window.processDAWAudioBuffer && window.__pitchDetectorReady) {"
    "  const leftChannel = new Float32Array([");
  
  // Aggiungi samples del canale sinistro
  for (int i = 0; i < nFrames; i++) {
    jsCode.AppendFormatted(32, "%f%s", inputs[0][i], i < nFrames-1 ? "," : "");
  }
  
  jsCode.Append("]);"
    "  const rightChannel = new Float32Array([");
  
  // Aggiungi samples del canale destro
  for (int i = 0; i < nFrames; i++) {
    jsCode.AppendFormatted(32, "%f%s", inputs[1][i], i < nFrames-1 ? "," : "");
  }
  
  jsCode.AppendFormatted(128, 
    "]);"
    "  window.processDAWAudioBuffer(leftChannel, rightChannel, %f);"
    "}", 
    GetSampleRate());
  
  // Esegui il codice JavaScript
  mWebView->EvaluateJavaScript(jsCode.Get());
}

void MyPitchPlugin::OnReset()
{
  // Reset quando cambia il sample rate o buffer size
}

void MyPitchPlugin::OnParamChange(int paramIdx)
{
  // Handle parameter changes
}
```

---

## 🎯 Step 4: Configurazione Plugin

### 4.1 File `config.h`

```cpp
#define PLUG_NAME "Poly Analysis"
#define PLUG_MFR "YourName"
#define PLUG_VERSION_HEX 0x00010000
#define PLUG_VERSION_STR "1.0.0"
#define PLUG_UNIQUE_ID 'PtAn'
#define PLUG_MFR_ID 'Acme'

#define PLUG_WIDTH 600  // IMPORTANTE: dimensione fissa per VST3!
#define PLUG_HEIGHT 600 // IMPORTANTE: dimensione fissa per VST3!
#define PLUG_FPS 60

#define PLUG_TYPE 1 // 0=instrument, 1=effect
#define PLUG_DOES_MIDI_IN 0
#define PLUG_DOES_MIDI_OUT 0

#define PLUG_CHANNEL_IO "2-2" // Stereo in, stereo out

#define VST3_SUBCATEGORY "Fx|Analyzer"
```

---

## 🔨 Step 5: Build del Plugin

### Mac (Xcode):

```bash
cd MyPitchPlugin
mkdir build && cd build
cmake -G Xcode ..
open MyPitchPlugin.xcodeproj

# Build in Xcode (Product > Build)
# Il plugin sarà in: ~/Library/Audio/Plug-Ins/VST3/MyPitchPlugin.vst3
```

### Windows (Visual Studio):

```bash
cd MyPitchPlugin
mkdir build && cd build
cmake -G "Visual Studio 16 2019" -A x64 ..

# Apri MyPitchPlugin.sln in Visual Studio
# Build (Ctrl+Shift+B)
# Il plugin sarà in: C:\Program Files\Common Files\VST3\MyPitchPlugin.vst3
```

---

## 🌐 Step 6: Cross-Platform Build con GitHub Actions

Crea `.github/workflows/build.yml`:

```yaml
name: Build VST3 Plugin

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build React App
        run: |
          npm install
          npm run build
      
      - name: Copy to iPlug2
        run: cp -r dist/* MyPitchPlugin/resources/web/
      
      - name: Build VST3
        run: |
          cd MyPitchPlugin
          mkdir build && cd build
          cmake -G Xcode ..
          xcodebuild -configuration Release
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: MyPitchPlugin-macOS
          path: MyPitchPlugin/build/VST3/Release/MyPitchPlugin.vst3

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build React App
        run: |
          npm install
          npm run build
      
      - name: Copy to iPlug2
        run: xcopy /E /I dist\* MyPitchPlugin\resources\web\
      
      - name: Build VST3
        run: |
          cd MyPitchPlugin
          mkdir build
          cd build
          cmake -G "Visual Studio 16 2019" -A x64 ..
          cmake --build . --config Release
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: MyPitchPlugin-Windows
          path: MyPitchPlugin/build/VST3/Release/MyPitchPlugin.vst3
```

---

## ✅ Testing

### 1. **Nel Browser** (sviluppo):
```bash
npm run dev
# Il plugin usa il microfono in modalità Demo
```

### 2. **Come VST3** (produzione):
- Apri Logic Pro / Reaper / FL Studio
- Crea una traccia audio
- Inserisci il plugin "Pitch Analyzer" nella traccia
- Il plugin riceverà automaticamente l'audio dalla traccia
- L'app rileverà `window.__VST3_MODE = true` e attiverà la modalità DAW

---

## 🎛️ Come Funziona

### Flusso Audio:

```
DAW Input → MyPitchPlugin.cpp → ProcessBlock()
                                      ↓
                          SendAudioToWebView()
                                      ↓
                    window.processDAWAudioBuffer(left, right, sampleRate)
                                      ↓
                          PitchDetector.tsx (React)
                                      ↓
                            FFT Analysis (8192 punti)
                                      ↓
                        Visualizzazione (Canvas)
```

### Modalità Automatiche:

| Modalità | `window.__VST3_MODE` | Input Audio | UI Controls |
|----------|---------------------|-------------|-------------|
| **Browser** | `undefined` | Microfono | Demo/Real Mic Toggle |
| **VST3** | `true` | DAW Track | Auto-attivo |

---

## 🐛 Troubleshooting

### Il plugin non riceve audio:
- Verifica che la traccia DAW abbia input audio attivo
- Controlla il routing nella DAW
- Verifica che `PLUG_CHANNEL_IO` sia corretto

### La web app non carica:
- Verifica che `dist/` sia copiato in `resources/web/`
- Controlla la console JavaScript (iPlug2 debug mode)
- Verifica che `window.__VST3_MODE` sia `true`

### Problemi di performance:
- Riduci il sample rate (48kHz → 44.1kHz)
- Aumenta il buffer size nella DAW (256 → 512 samples)
- Ottimizza il codice JavaScript (usa Web Workers)

---

## 📚 Risorse

- [iPlug2 Documentation](https://iplug2.github.io/)
- [VST3 SDK](https://steinbergmedia.github.io/vst3_dev_portal/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## 🎉 Successo!

Ora hai un plugin VST3 professionale che analizza il pitch in tempo reale, funzionante su Mac e Windows! 🎹✨