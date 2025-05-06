import * as Cesium from "cesium";
import { activeSats } from "./launchSat";

let cameraIndex = 0;
let viewerInstance: Cesium.Viewer | null = null;
let cameraActive = false;

export function attachChaseCamera(viewer: Cesium.Viewer) {
  viewerInstance = viewer;
  cameraIndex = 0;
  cameraActive = true;
  console.log("[Camera] Attached chase camera.");
}

export function startChaseCamera(viewer?: Cesium.Viewer) {
  if (viewer) viewerInstance = viewer;
  if (!viewerInstance) {
    console.warn("[Camera] No viewer instance to start chase camera.");
    return;
  }
  cameraActive = true;
  console.log("[Camera] Chase camera enabled.");
}

export function stopChaseCamera() {
  cameraActive = false;
  console.log("[Camera] Chase camera disabled.");
}

export function jumpToNextSatellite(viewer?: Cesium.Viewer) {
  const v = viewer || viewerInstance;
  if (!v || !activeSats.length) return;

  cameraIndex = (cameraIndex + 1) % activeSats.length;
  const sat = activeSats[cameraIndex];
  if (!sat?.position) return;

  const direction = Cesium.Cartesian3.normalize(
    sat.position,
    new Cesium.Cartesian3()
  );
  const destination = Cesium.Cartesian3.multiplyByScalar(
    direction,
    100000,
    new Cesium.Cartesian3()
  );

  v.camera.flyTo({
    destination,
    orientation: {
      heading: 0,
      pitch: -Cesium.Math.PI_OVER_TWO,
      roll: 0,
    },
  });

  console.log(`[Camera] Jumped to satellite ${cameraIndex}.`);
}
