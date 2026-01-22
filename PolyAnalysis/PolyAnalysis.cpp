#include "PolyAnalysis.h"
#include "IPlug_include_in_plug_src.h"
#include <cmath>
#include <algorithm>

PolyAnalysis::PolyAnalysis(const InstanceInfo& info)
: iplug::Plugin(info, MakeConfig(kNumParams, kNumPresets))
{
  GetParam(kGain)->InitDouble("Gain", 0., -70., 12.0, 0.01, "dB");
  // WebView UI: load index.html from Resources/web (bundled by CMake WEB_RESOURCES)
  mEditorInitFunc = [&]() {
    SetEnableDevTools(true);
    LoadIndexHtml(__FILE__, GetBundleID());
    EnableScroll(false);
  };
}

#if IPLUG_DSP
void PolyAnalysis::OnReset()
{
}

void PolyAnalysis::OnParamChange(int paramIdx)
{
  switch (paramIdx)
  {
    default: break;
  }
}

void PolyAnalysis::ProcessBlock(sample** inputs, sample** outputs, int nFrames)
{
  const int nIn = NInChansConnected();
  const int nOut = NOutChansConnected();

  for (int s = 0; s < nFrames; ++s)
  {
    for (int c = 0; c < nOut; ++c)
    {
      const int inIdx = c < nIn ? c : 0;
      outputs[c][s] = inputs[inIdx][s];
    }
  }

}
#endif
