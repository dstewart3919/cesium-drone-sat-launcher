import * as Cesium from 'cesium';
import { activeSats } from './launchSat';

let chaseSatIndex = 0;
let cameraTracking = false;
let lastSatPosition: Cesium.Cartesian3 | null = null;

export function jumpToNextSatellite(viewer: Cesium.Viewer) {
  if (activeSats.length === 0) return;
  const sat = activeSats[chaseSatIndex % activeSats.length];
  chaseSatIndex++;
  cameraTracking = false; // Disable chase cam during manual jumps
  console.log('[Camera] Jumping to satellite index:', chaseSatIndex - 1);
  viewer.camera.flyTo({
    destination: sat.position,
    duration: 1.5,
    maximumHeight: 1e7
  });
}

export function attachChaseCamera(viewer: Cesium.Viewer) {
  viewer.scene.preRender.addEventListener(() => {
    if (!cameraTracking || activeSats.length === 0) return;
    const sat = activeSats[0];
    if (!sat || sat.dead || !sat.position || !sat.velocity) return;

    if (!lastSatPosition || !Cesium.Cartesian3.equals(sat.position, lastSatPosition)) {
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

      const heading = 0;
      const pitch = -0.5;
      const range = 3000;

      try {
        viewer.camera.lookAt(sat.position, new Cesium.HeadingPitchRange(heading, pitch, range));
        lastSatPosition = Cesium.Cartesian3.clone(sat.position);

        const alt = Cesium.Cartesian3.magnitude(sat.position) - 6371000;
        console.log('[Camera] Updated to follow sat. Alt:', alt.toFixed(2));
      } catch (err) {
        console.warn('[Camera] LookAt failed:', err);
      }
    }
  });
}

export function startChaseCamera() {
  cameraTracking = true;
  console.log('[Camera] Chase camera enabled');
}

export function stopChaseCamera() {
  cameraTracking = false;
  console.log('[Camera] Chase camera disabled');
}