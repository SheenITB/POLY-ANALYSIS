#pragma once

#include "IPlug_include_in_plug_hdr.h"
#include "../IPlug/Extras/WebView/IPlugWebView.h"
#include <vector>

const int kNumPresets = 1;

enum EParams
{
  kGain = 0,
  kNumParams
};

using namespace iplug;
using namespace igraphics;

class PolyAnalysis final : public Plugin
{
public:
  PolyAnalysis(const InstanceInfo& info);

#if IPLUG_DSP
  void ProcessBlock(sample** inputs, sample** outputs, int nFrames) override;
  void OnReset() override;
  void OnParamChange(int paramIdx) override;
#endif

private:
  // UI lifecycle handled by WebView editor delegate (LoadIndexHtml in constructor)
};
