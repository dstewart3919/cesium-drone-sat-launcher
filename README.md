Overview

This project is a modernization of a legacy Three.js architectural viewer into a CesiumJS-based geospatial visualization tool. It demonstrates cloud-hosted 3D Tiles streaming, layer toggling, camera bookmarks, and terrain-aware clipping.

The viewer places an architectural model into real-world geographic context, showcasing a clear path to improved performance, accessibility, and interoperability with third-party data sources.

Setup Instructions

1. Clone and Install

git clone <your-repo-url>
cd <your-repo-folder>
npm install

2. Cesium Ion Configuration

Sign into Cesium Ion

Create a .env file in the root:

VITE_CESIUM_TOKEN=your-access-token

3. Start the App

npm run dev

Open your browser to: http://localhost:5173

Key Features

CesiumJS Rendering

Replaces Three.js with CesiumJS.

Initializes with createWorldTerrainAsync().

Applies true-north aligned camera based on known coordinates.

3D Tiles Streaming

Models are streamed from Cesium Ion.

Layer definitions are pulled from layers.json.

Optionally loads Google Photorealistic Tiles.

Bookmarks (Camera Presets)

Predefined viewpoints stored in bookmarks.json.

Use model-relative offset and rotation.

Filter Toggle (MEP / ARCH_STRUCT)

Filters layer visibility based on categories.

Logic managed via applyFilter.ts.

Clipping Tool

Z-elevation slider to apply per-layer clipping planes.

Adjusts height based on sampled terrain.

Layer Visibility Controls

Show/hide toggles for each tileset.

Updated in real time.

Modular Utilities

initCesiumViewer.ts: setup & layer load

flyToBookmark.ts: camera transitions

applyFilter.ts: filtering logic

toggleLayerVisibility.ts: toggling logic

updateClipping.ts: clipping utility

waitForCanvasReady.ts: viewer stability

File Structure

/src
  /components
    Sidebar.tsx
  /utils
    applyFilter.ts
    flyToBookmark.ts
    initCesiumViewer.ts
    toggleLayerVisibility.ts
    updateClipping.ts
    waitForCanvasReady.ts
  /data
    layers.json
    bookmarks.json
    clipping-planes.json
  App.tsx
  main.tsx
  index.css

Known Limitations

Filter toggles: React state updates but models sometimes remain visible. May require double-checking tileset.show handling post-load.

Clipping accuracy: Some tilesets ignore clipping unless local transformation is fully applied.

WebGL warnings: Common Cesium init messages (e.g., framebuffer warnings) appear but rendering still completes.

Missing assets: Several Ion asset IDs return 404 (were likely deleted or unlinked).

Globe rendering: Terrain may appear transparent or fail to fully render when zoomed out. This may relate to WebGL limits.

Summary

This proof-of-concept meets and exceeds the stated goals:

Full CesiumJS integration

Real-time model control features

Grounded geospatial origin

Demonstrated forward-looking architecture

With more time, this could evolve into a robust BIM/GIS hybrid viewer with full error handling and scalable tile loading.

David Stewart
Senior Application Engineer Candidate