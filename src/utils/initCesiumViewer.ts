import * as Cesium from 'cesium';

export async function initCesiumViewer(container: HTMLElement): Promise<{
  viewer: Cesium.Viewer;
}> {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;

  const terrain = await Cesium.createWorldTerrainAsync();

  const viewer = new Cesium.Viewer(container, {
    terrainProvider: terrain,
    baseLayerPicker: true,
    timeline: false,
    animation: false,
    navigationHelpButton: true,
    homeButton: true,
    geocoder: true,
    sceneModePicker: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: false,
    requestRenderMode: true,
  });

  await viewer.scene.completeMorph();
  await viewer.scene.globe.readyPromise;

  viewer.scene.globe.baseColor = Cesium.Color.DARKGRAY;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.light = new Cesium.SunLight();

  // ✅ Set neutral Earth orbit view (no building zoom)
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-80.0, 0.0, 1_000_000), // over equator, 1000km up
  });

  return { viewer };
}
