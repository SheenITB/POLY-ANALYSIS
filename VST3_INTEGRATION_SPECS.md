# VST3 Integration Specifications

## 📐 Plugin Window Dimensions

### Fixed Size (Required for VST3)
- **Total Height**: 600px (fixed)
- **Total Width**: Full width (responsive to DAW window)

### Page Structure (All 3 Pages Identical)
```
┌─────────────────────────────────┐
│ Tab Navigation (auto height)    │
├─────────────────────────────────┤
│ Header: 50px (h-[50px])         │ ← FIXED
├─────────────────────────────────┤
│ Content: 550px (h-[550px])      │ ← FIXED
│ overflow-hidden                  │
└─────────────────────────────────┘
TOTAL: 600px
```

## ✅ Safety Measures Implemented

### 1. **Overflow Protection**
- All content areas have `overflow-hidden`
- All elements have `flex-shrink-0` where needed
- No scrollbars will appear

### 2. **Fixed Heights**
- Headers: `h-[50px]` with `flex items-center`
- Content: `h-[550px]` with `overflow-hidden`
- No `p-3` or variable padding on headers (using `px-3` only)

### 3. **TuningIndicator Safety**
- Container: 540px internal height (10px margin of safety)
- Large text elements won't overflow
- All spacing calculated to fit within bounds

### 4. **NoteDisplay Safety**
- 12 notes × 44px (h-11) = 528px
- All elements have `flex-shrink-0`
- Waveform canvas has `overflow-hidden`

## 🔧 iPlug2 Integration Settings

### Recommended Settings (config.h)
```cpp
#define PLUG_WIDTH 800
#define PLUG_HEIGHT 600
#define PLUG_HOST_RESIZE 0  // Disable host resizing
#define PLUG_MIN_WIDTH 800
#define PLUG_MAX_WIDTH 800
#define PLUG_MIN_HEIGHT 600
#define PLUG_MAX_HEIGHT 600
```

### WebView Settings
```cpp
// Use fixed size, no scaling
mWebView->SetSize(800, 600);
mWebView->SetZoom(1.0);  // No zoom
```

## ⚠️ Potential Issues & Solutions

### Issue 1: DPI Scaling on Windows
**Problem**: Windows might scale UI elements differently
**Solution**: iPlug2 should handle DPI scaling automatically, but test on:
- 100% scaling
- 125% scaling
- 150% scaling

### Issue 2: Font Rendering
**Problem**: Large fonts (text-[100px]) might render differently
**Solution**: 
- TuningIndicator uses 540px internal height (10px safety margin)
- All text uses `leading-none` to minimize line-height
- `flex-shrink-0` prevents compression

### Issue 3: Border Calculations
**Problem**: Some browsers calculate borders differently
**Solution**:
- All borders are inside overflow-hidden containers
- `box-sizing: border-box` is default in Tailwind

### Issue 4: Different DAW Renderers
**Problem**: Logic (Cocoa), FL Studio (Windows), Reaper (cross-platform) use different renderers
**Solution**:
- All dimensions are fixed pixels (not vh/vw)
- No dynamic calculations
- overflow-hidden prevents content bleeding

## 🧪 Testing Checklist

### Before Converting to VST3:
- [ ] All 3 pages are exactly 600px tall
- [ ] No scrollbars appear on any page
- [ ] Switch between pages shows no layout shift
- [ ] Large text in Tuner doesn't overflow
- [ ] Chromatic Scale shows all 12 notes without scroll
- [ ] Analyze page content is centered

### After iPlug2 Integration:
- [ ] Test on macOS (Logic Pro, Reaper)
- [ ] Test on Windows (FL Studio, Reaper)
- [ ] Test at different DPI settings (100%, 125%, 150%)
- [ ] Test resizing DAW window (plugin should stay fixed)
- [ ] Test audio input detection works
- [ ] Test page switching doesn't crash

## 🎯 Final Guarantee

### What IS Guaranteed (Web Code):
✅ All 3 pages have identical 600px height
✅ Headers are exactly 50px
✅ Content areas are exactly 550px
✅ No overflow/scroll will occur
✅ No layout shift between pages
✅ All dimensions are fixed pixels

### What Requires Testing (VST3 Environment):
⚠️ DPI scaling behavior on Windows
⚠️ Font rendering across different DAWs
⚠️ WebView performance
⚠️ Audio input integration
⚠️ Cross-platform consistency

## 📝 Notes

1. **Width**: The width is set to `w-full` to fill the DAW window. iPlug2 should set a fixed width (recommended: 800px).

2. **Responsive**: The design is NOT responsive. It expects a fixed 800×600 window.

3. **No min/max-width**: Removed all max-width constraints to ensure consistent sizing.

4. **overflow-hidden**: Critical for VST3 - prevents scrollbars that would look unprofessional.

5. **flex-shrink-0**: Prevents flexbox from compressing elements when space is tight.

## 🔊 Audio Monitoring (Pass-Through)

### Web Implementation
The web version includes an **Audio Monitoring** control in the Analyze page that allows users to hear the input audio:

- **Volume Control**: Slider (0-100%) to control monitoring volume
- **Mute/Unmute**: Quick toggle button
- **Feedback Warning**: Displays warning when volume > 0 to use headphones

### Implementation Details
```typescript
// In PitchDetector.tsx
if (monitorVolume !== undefined && monitorVolume > 0) {
  const gainNode = audioContextRef.current.createGain();
  gainNode.gain.value = monitorVolume;
  sourceRef.current.connect(gainNode);
  gainNode.connect(audioContextRef.current.destination);
}
```

### VST3 Implementation (iPlug2)
In a VST3 plugin, audio pass-through is much simpler and more efficient:

```cpp
// In ProcessBlock()
void YourPlugin::ProcessBlock(sample** inputs, sample** outputs, int nFrames) {
  // Copy input to output (pass-through)
  for (int s = 0; s < nFrames; s++) {
    outputs[0][s] = inputs[0][s]; // Left channel
    outputs[1][s] = inputs[1][s]; // Right channel
  }
  
  // Then perform analysis on inputs for pitch detection
  // ... FFT analysis code ...
}
```

**Benefits of VST3 Pass-Through:**
- ✅ Zero latency (direct buffer copy)
- ✅ No feedback issues (DAW controls routing)
- ✅ Professional audio quality
- ✅ Integrated with DAW's monitoring system
- ✅ Works with all DAW routing configurations

**Note**: In a DAW environment, users control monitoring through the DAW's mixer, so the volume slider in the web version is mainly for browser testing. The VST3 should always pass audio through transparently.