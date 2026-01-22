# 🎨 Design Specification - Poly Analysis

Documentazione tecnica completa del design UI/UX per la conversione in iPlug2.

## 🎨 Color Palette

### Background Colors

```css
/* Main background gradient */
bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400

/* Main card */
bg-slate-100/90 backdrop-blur-xl

/* Header */
bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300

/* Panels and sections */
bg-slate-50
```

### Note Colors (12 Unique Gradients)

Ogni nota ha un colore distintivo vivace:

```typescript
const noteColors = {
  'C':  'from-red-500 to-red-600',      // Rosso
  'C#': 'from-orange-500 to-orange-600', // Arancione
  'D':  'from-amber-500 to-amber-600',   // Ambra
  'D#': 'from-yellow-500 to-yellow-600', // Giallo
  'E':  'from-lime-500 to-lime-600',     // Lime
  'F':  'from-green-500 to-green-600',   // Verde
  'F#': 'from-emerald-500 to-emerald-600', // Smeraldo
  'G':  'from-cyan-500 to-cyan-600',     // Ciano
  'G#': 'from-sky-500 to-sky-600',       // Cielo
  'A':  'from-blue-500 to-blue-600',     // Blu
  'A#': 'from-purple-500 to-purple-600', // Viola
  'B':  'from-pink-500 to-pink-600',     // Rosa
}
```

### Keyboard Keys Colors

```css
/* Tasti bianchi (C, D, E, F, G, A, B) - INATTIVI */
background: slate-200
border: slate-300
text: slate-800

/* Tasti neri (C#, D#, F#, G#, A#) - INATTIVI */
background: slate-800
border: slate-700
text: slate-200

/* Tasti ATTIVI - Entrambi */
background: nota specifica con gradiente
text: white
shadow: glow colorato
scale: 1.05 (ingrandimento)
```

### State Colors

```css
/* Listening Active */
from-emerald-400 to-cyan-400 (pulsante)
animate-pulse

/* Stopped */
from-red-600 to-pink-600 (pulsante)

/* Error */
from-red-50 to-pink-50 (background)
text-red-600/700
```

## 📐 Layout Structure

### Main Container

```
┌─────────────────────────────────────────────┐
│ HEADER (Gradient slate-200/300)            │
│ ├─ Logo (purple/blue/cyan gradient)        │
│ ├─ Title "Poly Analysis"                   │
│ └─ Start/Stop Button                       │
├─────────────────────────────────────────────┤
│ ERROR MESSAGE (conditional)                │
├─────────────────────────────────────────────┤
│ MAIN CONTENT (2 columns)                   │
│ ┌────────────┬──────────────────────────┐  │
│ │ NOTES      │ TUNING INDICATOR         │  │
│ │ SIDEBAR    │                          │  │
│ │ 280px      │ ┌──────────────────────┐ │  │
│ │            │ │ Current Note/Freq    │ │  │
│ │ C          │ └──────────────────────┘ │  │
│ │ C# (dark)  │                          │  │
│ │ D          │ ┌──────────────────────┐ │  │
│ │ D# (dark)  │ │ Tuning Meter         │ │  │
│ │ E          │ │ [-50  0  +50]        │ │  │
│ │ F          │ │   ┌─┴─┐              │ │  │
│ │ F# (dark)  │ │   │ ● │              │ │  │
│ │ G          │ │   └───┘              │ │  │
│ │ G# (dark)  │ └──────────────────────┘ │  │
│ │ A          │                          │  │
│ │ A# (dark)  │ ┌──────────────────────┐ │  │
│ │ B          │ │ Info Panel           │ │  │
│ │            │ │ Status | Note | Freq │ │  │
│ │            │ └──────────────────────┘ │  │
│ └────────────┴──────────────────────────┘  │
├─────────────────────────────────────────────┤
│ FOOTER                                      │
└─────────────────────────────────────────────┘
```

### Responsive Breakpoints

```css
/* Desktop */
lg:grid-cols-[280px_1fr]  /* 2 colonne */

/* Mobile */
grid-cols-1  /* 1 colonna, stack verticale */
```

## 🎹 Note Display Component

### Dimensioni e Spaziatura

```css
/* Container */
gap: 0.25rem (1px tra le note)

/* Singola nota */
padding: 0.75rem 1.5rem (py-3 px-6)
border-radius: 0.5rem (rounded-lg)

/* Stato attivo */
transform: scale(1.05)
box-shadow: lg + colorato
```

### Stati

#### **Inattiva - Tasto Bianco**
```css
background: #e2e8f0 (slate-200)
border: 1px solid #cbd5e1 (slate-300)
color: #1e293b (slate-800)
transition: 150ms
hover:background: #cbd5e1 (slate-300)
```

#### **Inattiva - Tasto Nero**
```css
background: #1e293b (slate-800)
border: 1px solid #334155 (slate-700)
color: #e2e8f0 (slate-200)
transition: 150ms
hover:background: #334155 (slate-700)
```

#### **Attiva**
```css
background: linear-gradient(to right, [color]-500, [color]-600)
color: #ffffff
box-shadow: 0 10px 15px [color]/50
transform: scale(1.05)
position: relative
overflow: hidden

/* Effetto pulse */
::before {
  background: white/20
  animation: pulse
}
```

### Contenuto

```typescript
// Testo principale
font-family: monospace
font-size: 1rem

// Ottava (se attiva)
font-size: 0.75rem
opacity: 0.75
position: right
```

## 📊 Tuning Indicator Component

### Layout

```
┌──────────────────────────────────┐
│ TUNING                           │ ← Label
│                                  │
│ C4                               │ ← Nota grande
│ 261.63 Hz                        │ ← Frequenza
│                                  │
│ ┌────────────────────────────┐   │
│ │ -50         0         +50  │   │ ← Scale
│ │              │             │   │ ← Center line
│ │         ┌────┴────┐        │   │
│ │         │    ●    │        │   │ ← Needle
│ │         └─────────┘        │   │
│ │                            │   │
│ └────────────────────────────┘   │
│                                  │
│ +12 cents                        │ ← Cents text
│ (Slightly Sharp)                 │ ← Status
└──────────────────────────────────┘
```

### Tuning Meter Specifiche

#### Container
```css
height: 96px (h-24)
background: slate-50
border: 1px solid slate-300
border-radius: 0.5rem
overflow: hidden
position: relative
```

#### Center Line
```css
position: absolute
left: 50%
width: 2px
background: slate-400
top: 0
bottom: 0
```

#### Needle Position
```typescript
// Calcolo posizione X
const position = 50 + (cents / 50) * 45; // percentuale
// Range: 5% a 95% (margini 5% per lato)

// Clamp ai limiti
const clampedPosition = Math.max(5, Math.min(95, position));
```

#### Needle Style
```css
position: absolute
width: 80px
height: 80px
top: 50%
transform: translate(-50%, -50%)
transition: left 100ms ease-out

/* Shape */
clip-path: polygon(40% 0%, 60% 0%, 50% 100%)

/* Colore dinamico */
if (cents < -10) → red-500 (flat)
if (cents > 10) → red-500 (sharp)
if (-10 <= cents <= 10) → emerald-500 (in tune)
```

#### Cents Range Colors

```typescript
// Gradient bar background
if (cents < -20) → 'from-red-400/30 to-transparent'
if (cents > 20) → 'from-transparent to-red-400/30'
if (-20 <= cents <= 20) → 'from-emerald-400/20 via-emerald-500/30 to-emerald-400/20'
```

### Cents Text Display

```typescript
// Formato
if (cents > 0) → `+${cents} cents`
if (cents < 0) → `${cents} cents`
if (cents === 0) → `Perfect!`

// Colore
if (abs(cents) <= 5) → emerald-600 (perfetto)
if (5 < abs(cents) <= 15) → amber-600 (quasi)
if (abs(cents) > 15) → red-600 (stono)
```

### Status Messages

```typescript
const status = {
  cents <= -30: "Very Flat",
  -30 < cents <= -10: "Flat",
  -10 < cents < -5: "Slightly Flat",
  -5 <= cents <= 5: "In Tune ✓",
  5 < cents < 10: "Slightly Sharp",
  10 <= cents < 30: "Sharp",
  cents >= 30: "Very Sharp"
}
```

## 🎛️ Button States

### Start/Stop Button

#### Start (Inactive)
```css
background: linear-gradient(to right, emerald-600, cyan-600)
hover: linear-gradient(to right, emerald-700, cyan-700)
shadow: 0 4px 6px emerald-500/30
icon: Mic
text: "Start Listening"
```

#### Stop (Active)
```css
background: linear-gradient(to right, red-600, pink-600)
hover: linear-gradient(to right, red-700, pink-700)
shadow: 0 4px 6px red-500/30
icon: MicOff
text: "Stop"
```

## 📏 Typography

### Headings

```css
/* Main title */
font-size: 1.25rem (text-xl)
font-weight: bold
color: slate-900

/* Subtitle */
font-size: 0.875rem (text-sm)
color: slate-700

/* Section labels */
font-size: 0.875rem (text-sm)
font-family: monospace
color: slate-600
```

### Data Display

```css
/* Note name */
font-size: 2.25rem (text-4xl)
font-family: monospace
color: slate-900

/* Octave */
font-size: 1.5rem (text-2xl)
color: slate-700

/* Frequency */
font-size: 1.125rem (text-lg)
color: slate-700
```

## 🌟 Animations & Transitions

### Pulse Animation (Active State)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Usage */
.active-note::before {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Transitions

```css
/* Note cards */
transition: all 150ms ease-in-out

/* Needle position */
transition: left 100ms ease-out

/* Button states */
transition: all 300ms ease-in-out

/* Scale effects */
transition: transform 150ms ease-in-out
```

### Status Indicator

```css
/* Dot active */
width: 0.5rem
height: 0.5rem
border-radius: 9999px
background: linear-gradient(to right, emerald-400, cyan-400)
box-shadow: 0 4px 6px emerald-500/50
animation: pulse 2s infinite

/* Dot inactive */
background: slate-300
animation: none
```

## 🔧 Glassmorphism Effects

```css
/* Main card */
background: rgba(241, 245, 249, 0.9) (slate-100/90)
backdrop-filter: blur(24px)
border: 1px solid rgb(203, 213, 225) (slate-300)

/* Header */
backdrop-filter: blur(8px)

/* Panels */
background: slate-50
backdrop-filter: blur(4px)
```

## 📱 Responsive Design

### Desktop (≥1024px)

```css
/* Grid layout */
grid-template-columns: 280px 1fr
gap: 1.5rem

/* Full sidebar visible */
display: block
```

### Mobile (<1024px)

```css
/* Stack layout */
grid-template-columns: 1fr
gap: 1rem

/* Sidebar becomes horizontal scrollable or full width */
width: 100%
```

## 🎯 UX Behaviors

### Initial State
- Button: "Start Listening" verde
- Notes: tutte inattive (bianche/nere)
- Tuning meter: vuoto
- Info panel: "--" placeholder
- Instructions: visibili

### Listening State
- Button: "Stop" rosso con pulse
- Notes: animazione quando rilevata
- Tuning meter: needle animata
- Info panel: dati in tempo reale
- Instructions: nascoste

### Error State
- Banner rosso visibile
- Istruzioni per permessi browser
- Button: ritorna a "Start Listening"
- Close button (X) per dismissare

### No Signal Detected
- Button: "Stop" attivo
- Notes: tutte inattive
- Tuning meter: vuoto ma pronto
- Info panel: "-- Hz"

## 🎨 Design Tokens (per iPlug2)

```cpp
// Colors (RGB)
const Color NOTE_COLORS[] = {
    Color(239, 68, 68),    // C - red-500
    Color(249, 115, 22),   // C# - orange-500
    Color(245, 158, 11),   // D - amber-500
    Color(234, 179, 8),    // D# - yellow-500
    Color(132, 204, 22),   // E - lime-500
    Color(34, 197, 94),    // F - green-500
    Color(16, 185, 129),   // F# - emerald-500
    Color(6, 182, 212),    // G - cyan-500
    Color(14, 165, 233),   // G# - sky-500
    Color(59, 130, 246),   // A - blue-500
    Color(168, 85, 247),   // A# - purple-500
    Color(236, 72, 153)    // B - pink-500
};

// Backgrounds
const Color BG_LIGHT = Color(226, 232, 240);  // slate-200
const Color BG_DARK = Color(30, 41, 59);      // slate-800
const Color BG_PANEL = Color(248, 250, 252);  // slate-50

// Borders
const Color BORDER_LIGHT = Color(203, 213, 225);  // slate-300
const Color BORDER_DARK = Color(51, 65, 85);      // slate-700

// Sizes
const int NOTE_HEIGHT = 48;
const int NOTE_SPACING = 4;
const int METER_WIDTH = 400;
const int METER_HEIGHT = 96;
const int SIDEBAR_WIDTH = 280;
```

## 📊 Accessibility

- **Contrasto**: Tutti i testi rispettano WCAG AA (4.5:1 minimo)
- **Focus states**: Bordi visibili su tutti gli elementi interattivi
- **Screen readers**: Aria labels su icone e stati
- **Keyboard navigation**: Tab order logico

---

**Questa specifica è pronta per l'implementazione in iPlug2 C++!** 🚀