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

  const defaultPosition = Cesium.Cartesian3.fromDegrees(-79.886646, 40.022376, 300);
  viewer.scene.camera.setView({ destination: defaultPosition });

  return { viewer };
}
