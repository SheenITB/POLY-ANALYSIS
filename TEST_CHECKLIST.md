# ✅ Test Checklist - Poly Analysis

## Pre-Download Verification

### ✅ File Structure
- [x] `/src/app/App.tsx` - Main component
- [x] `/src/app/components/PitchDetector.tsx` - Pitch detection algorithm
- [x] `/src/app/components/NoteDisplay.tsx` - Chromatic scale display
- [x] `/src/app/components/TuningIndicator.tsx` - Tuning meter
- [x] `/package.json` - Dependencies configuration
- [x] `/vite.config.ts` - Build configuration
- [x] `/README.md` - Documentation
- [x] `/DESIGN_SPEC.md` - Design specifications
- [x] `/ALGORITHM_SPEC.md` - Algorithm documentation
- [x] `/.gitignore` - Git ignore rules

### ✅ Dependencies Check
All required packages are in `package.json`:
- [x] React 18.3.1
- [x] Vite 6.3.5
- [x] Tailwind CSS 4.1.12
- [x] Lucide React 0.487.0 (icons)
- [x] All UI components

### ✅ Code Quality
- [x] No syntax errors
- [x] TypeScript types defined
- [x] Web Audio API properly implemented
- [x] Error handling present
- [x] Responsive design implemented

---

## 🚀 Download & Setup Test

### Step 1: Extract Project
```bash
# Extract the ZIP file
unzip poly-analysis.zip
cd poly-analysis
```
**Expected:** Folder structure matches above ✅

---

### Step 2: Install Dependencies
```bash
npm install
```

**Expected Output:**
```
added XXX packages in XXs
```

**Check for:**
- ✅ No error messages
- ✅ `node_modules/` folder created
- ✅ `package-lock.json` created

**Common Issues:**
- ❌ "npm not found" → Install Node.js first
- ❌ "EACCES permission denied" → Use `sudo npm install` (Linux/Mac)

---

### Step 3: Start Dev Server
```bash
npm run dev
```

**Expected Output:**
```
  VITE v6.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Check for:**
- ✅ Server starts without errors
- ✅ Port 5173 is available (or auto-increments to 5174, etc.)
- ✅ No compilation errors

**Common Issues:**
- ❌ "Port already in use" → Kill process on port 5173 or use different port
- ❌ TypeScript errors → Check Node.js version (must be v18+)

---

## 🌐 Browser Test

### Step 4: Open in Browser

**Action:** Navigate to `http://localhost:5173`

**Expected:**
- ✅ Page loads without errors
- ✅ Background: Gradient slate-200/300/400
- ✅ Main card: White/glass effect visible
- ✅ Header: "Poly Analysis" title with gradient logo
- ✅ Button: "Start Listening" (green gradient)
- ✅ Chromatic scale: 12 notes visible on left
  - White keys: C, D, E, F, G, A, B (light slate-200)
  - Black keys: C#, D#, F#, G#, A# (dark slate-800)
- ✅ Tuning meter: Empty but visible
- ✅ Info panel: Shows "--" placeholders
- ✅ Instructions visible at bottom

**Screenshot Checkpoint 1:** Page loaded ✅

---

### Step 5: Microphone Permission Test

**Action:** Click "Start Listening" button

**Expected - Browser Permission Dialog:**
- ✅ Browser shows microphone permission request
- ✅ Message shows site URL (localhost:5173)

**Action:** Click "Allow" / "Permetti"

**Expected After Permission:**
- ✅ Button changes to "Stop" (red gradient)
- ✅ Status indicator turns green and pulses
- ✅ Instructions disappear
- ✅ No error messages

**Common Issues:**
- ❌ Permission denied → See troubleshooting section below
- ❌ "No microphone found" → Connect microphone and refresh
- ❌ Red error banner → Follow instructions in banner

**Screenshot Checkpoint 2:** Listening active ✅

---

## 🎤 Audio Detection Test

### Step 6: Silent Test (No Audio)

**Action:** Button is on "Stop", but stay silent

**Expected:**
- ✅ Status: "Active"
- ✅ All notes: Inactive (white/black background)
- ✅ Detected: "--"
- ✅ Frequency: "-- Hz"
- ✅ Tuning meter: Empty

**Screenshot Checkpoint 3:** Active but silent ✅

---

### Step 7: Single Note Test

**Action:** Sing or play a sustained note (e.g., "Aaaah" or guitar/piano)

**Expected:**
- ✅ One note lights up with vivid color gradient
- ✅ Note name appears large in tuning indicator
- ✅ Frequency displays (e.g., "440.23 Hz")
- ✅ Cents value shows (e.g., "+12 cents")
- ✅ Tuning needle moves left/right based on cents
- ✅ Status text updates ("Flat" / "In Tune" / "Sharp")
- ✅ Active note has pulse animation
- ✅ Active note shows octave number (e.g., "4")

**Test Multiple Notes:**
```
Test C  → Red gradient
Test C# → Orange gradient (BLACK KEY)
Test D  → Amber gradient
Test D# → Yellow gradient (BLACK KEY)
Test E  → Lime gradient
Test F  → Green gradient
Test F# → Emerald gradient (BLACK KEY)
Test G  → Cyan gradient
Test G# → Sky gradient (BLACK KEY)
Test A  → Blue gradient
Test A# → Purple gradient (BLACK KEY)
Test B  → Pink gradient
```

**Screenshot Checkpoint 4:** Note detected (active color) ✅

---

### Step 8: Tuning Accuracy Test

**Action:** Use a tuner app or instrument tuned to A4 (440 Hz)

**Expected:**
- ✅ Detected note: "A4"
- ✅ Frequency: ~440 Hz (±1 Hz acceptable)
- ✅ Cents: Close to 0 (±5 cents)
- ✅ Needle: Centered (green if in tune)
- ✅ Status: "In Tune ✓"

**Screenshot Checkpoint 5:** Accurate tuning ✅

---

### Step 9: Cents Indicator Test

**Test Sharp (High):**
- Sing/play slightly higher than target note
- ✅ Cents: Positive number (e.g., +15)
- ✅ Needle: Moves RIGHT
- ✅ Color: Red (if >15 cents)
- ✅ Status: "Slightly Sharp" or "Sharp"

**Test Flat (Low):**
- Sing/play slightly lower than target note
- ✅ Cents: Negative number (e.g., -20)
- ✅ Needle: Moves LEFT
- ✅ Color: Red (if <-15 cents)
- ✅ Status: "Flat" or "Very Flat"

**Test In Tune:**
- Play perfectly tuned note
- ✅ Cents: 0 to ±5
- ✅ Needle: CENTER
- ✅ Color: Green
- ✅ Status: "In Tune ✓"

**Screenshot Checkpoint 6:** Cents indicator working ✅

---

### Step 10: Visual Effects Test

**Check Animations:**
- ✅ Active note: Scale up (1.05x)
- ✅ Active note: Pulse overlay animation
- ✅ Status dot: Pulse when listening
- ✅ Needle: Smooth transition (100ms)
- ✅ Button: Hover effects work

**Check Colors:**
- ✅ Black keys (C#, D#, F#, G#, A#): Dark background when inactive
- ✅ White keys (C, D, E, F, G, A, B): Light background when inactive
- ✅ All keys: Correct gradient when active

**Screenshot Checkpoint 7:** Visual effects ✅

---

### Step 11: Stop/Start Test

**Action:** Click "Stop" button

**Expected:**
- ✅ Button changes to "Start Listening" (green)
- ✅ Status indicator: Gray (inactive)
- ✅ All notes: Return to inactive state
- ✅ Tuning meter: Clears
- ✅ Info panel: Shows "--" again
- ✅ Instructions: Reappear

**Action:** Click "Start Listening" again

**Expected:**
- ✅ Reactivates without errors
- ✅ Permission not asked again (cached)
- ✅ Detection works immediately

**Screenshot Checkpoint 8:** Stop/restart working ✅

---

## 📱 Responsive Test

### Step 12: Mobile Layout

**Action:** Resize browser to mobile width (<768px)

**Expected:**
- ✅ Layout switches to single column
- ✅ Notes sidebar: Full width
- ✅ Tuning meter: Full width
- ✅ All elements still visible
- ✅ Text readable
- ✅ Buttons accessible

**Test on actual mobile (optional):**
- Open on phone via network IP
- Check touch responsiveness

**Screenshot Checkpoint 9:** Mobile layout ✅

---

## 🔧 Error Handling Test

### Step 13: Permission Denied Test

**Action:** 
1. Revoke microphone permission in browser settings
2. Click "Start Listening"

**Expected:**
- ✅ Red error banner appears
- ✅ Message: "Microphone access denied..."
- ✅ Instructions for each browser shown
- ✅ Close button (X) works
- ✅ Button returns to "Start Listening"

**Screenshot Checkpoint 10:** Error handling ✅

---

### Step 14: No Microphone Test

**Action:** Disconnect all microphones (or block in OS settings)

**Expected:**
- ✅ Error message: "No microphone found..."
- ✅ Graceful failure (no crash)

---

## 🏗️ Build Test

### Step 15: Production Build

**Action:**
```bash
npm run build
```

**Expected Output:**
```
vite v6.x.x building for production...
✓ XXX modules transformed.
dist/index.html                  X.XX kB │ gzip: X.XX kB
dist/assets/index-XXXXX.css     XX.XX kB │ gzip: X.XX kB
dist/assets/index-XXXXX.js     XXX.XX kB │ gzip: XX.XX kB
✓ built in XXXms
```

**Check:**
- ✅ `dist/` folder created
- ✅ `dist/index.html` exists
- ✅ `dist/assets/` contains CSS and JS files
- ✅ No build errors

---

### Step 16: Production Test

**Action:** Open `dist/index.html` in browser

**Expected:**
- ✅ App loads and works identically to dev mode
- ✅ All features functional
- ✅ Microphone permission works
- ✅ Performance is smooth

**Screenshot Checkpoint 11:** Production build working ✅

---

## 🎯 Performance Test

### Step 17: CPU/RAM Check

**Use browser DevTools (F12):**
1. Go to Performance tab
2. Start recording
3. Activate pitch detection
4. Sing/play for 10 seconds
5. Stop recording

**Expected:**
- ✅ CPU usage: <20% average
- ✅ RAM usage: <100 MB
- ✅ FPS: Stable 60 FPS
- ✅ No memory leaks

**Screenshot Checkpoint 12:** Performance metrics ✅

---

## 🌍 Browser Compatibility Test

### Step 18: Multi-Browser Test

**Test in each browser:**

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome  | 90+     | ✅/❌  |       |
| Firefox | 88+     | ✅/❌  |       |
| Edge    | 90+     | ✅/❌  |       |
| Safari  | 14+     | ✅/❌  |       |

**For each browser, verify:**
- ✅ Page loads
- ✅ Microphone permission works
- ✅ Pitch detection accurate
- ✅ UI renders correctly
- ✅ Animations smooth

---

## 📊 Final Summary

### All Tests Passed ✅

```
✅ File structure complete
✅ Dependencies installed
✅ Dev server starts
✅ Page loads correctly
✅ Microphone permission works
✅ Audio detection accurate
✅ Tuning indicator functional
✅ Cents calculation correct
✅ Visual effects working
✅ Colors correct (black/white keys)
✅ Responsive design works
✅ Error handling robust
✅ Production build successful
✅ Performance acceptable
✅ Cross-browser compatible
```

---

## 🐛 Common Issues & Solutions

### Issue: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: Microphone permission blocked
**Solution:** 
- Chrome: Settings → Privacy → Site Settings → Microphone
- Firefox: Address bar lock icon → Permissions
- Clear site data and try again

### Issue: No pitch detected
**Solution:**
- Increase microphone volume in OS settings
- Reduce background noise
- Sing/play louder or closer to mic
- Check RMS threshold (should be >0.01)

### Issue: Inaccurate cents
**Solution:**
- Use a reference tone (440 Hz A4)
- Check your instrument is in tune
- Ensure clean, sustained notes
- Avoid vibrato

### Issue: Laggy UI
**Solution:**
- Close other browser tabs
- Update browser to latest version
- Reduce buffer size (edit code: fftSize = 2048)

### Issue: Build fails
**Solution:**
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Check Node.js version: `node --version` (must be v18+)

---

## 🎉 Ready for Production!

If all tests pass, the project is ready to:
- ✅ Use as standalone web app
- ✅ Deploy to Netlify/Vercel/GitHub Pages
- ✅ Serve as reference for iPlug2 VST3 development
- ✅ Share with others

---

**Test Date:** _____________  
**Tester:** _____________  
**Result:** ✅ PASSED / ❌ FAILED  
**Notes:** _____________________________________________