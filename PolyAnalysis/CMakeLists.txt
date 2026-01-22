cmake_minimum_required(VERSION 3.14)
project(PolyAnalysis VERSION 1.0.0)

# Discover IPLUG2_DIR if not already set (for independent builds)
if(NOT DEFINED IPLUG2_DIR)
  set(IPLUG2_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../.." CACHE PATH "iPlug2 root directory")
endif()

# Include iPlug2 CMake configuration
include(${IPLUG2_DIR}/iPlug2.cmake)

# IGraphics backend/renderer can be set via command line:
#   cmake -DIGRAPHICS_BACKEND=SKIA -DIGRAPHICS_RENDERER=GL3 ..
# Defaults: NANOVG/METAL on macOS, NANOVG/GL2 on Windows
# See iPlug2/Scripts/cmake/IGraphics.cmake for all options

find_package(iPlug2 REQUIRED)

# Glob web resources (hashed filenames from Vite build)
file(GLOB WEB_RESOURCES
  "${CMAKE_CURRENT_SOURCE_DIR}/resources/web/*.html"
  "${CMAKE_CURRENT_SOURCE_DIR}/resources/web/assets/*"
)

# Build all formats except AUv3 (AUv3 is opt-in)
# To include AUv3: FORMATS ALL_AUV3
# To select specific formats: FORMATS APP VST3 AU
iplug_add_plugin(${PROJECT_NAME}
  SOURCES
    PolyAnalysis.cpp
    PolyAnalysis.h
    resources/resource.h
  RESOURCES
    resources/fonts/Roboto-Regular.ttf
    WEB_RESOURCES ${WEB_RESOURCES}
    UI WEBVIEW
)

  # -----------------------------------------------------------------------------
  # Copy Web UI bundle (built via Vite) into plugin Resources
  # Source UI dist is built from /Users/endrinhysa/Desktop/POLY ANALYSIS 
  set(UI_DIST_DIR "/Users/endrinhysa/Desktop/POLY ANALYSIS /dist")
  set(UI_DEST_DIR "${CMAKE_CURRENT_SOURCE_DIR}/resources/web")

  if(EXISTS "${UI_DIST_DIR}")
    add_custom_target(copy_webui ALL
      COMMAND ${CMAKE_COMMAND} -E make_directory "${UI_DEST_DIR}"
      COMMAND ${CMAKE_COMMAND} -E copy_directory "${UI_DIST_DIR}" "${UI_DEST_DIR}"
      COMMENT "Copying Web UI from ${UI_DIST_DIR} to ${UI_DEST_DIR}"
    )
    # Keep the VST3 target in sync with the UI bundle
    add_dependencies(${PROJECT_NAME}-vst3 copy_webui)
  else()
    message(WARNING "Web UI dist folder not found at ${UI_DIST_DIR}. Run npm run build in /Users/endrinhysa/Desktop/POLY ANALYSIS")
  endif()
