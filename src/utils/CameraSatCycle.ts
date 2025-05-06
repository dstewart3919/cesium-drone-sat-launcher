import * as Cesium from "cesium";
import { activeSats } from "./launchSat";

let chaseSatIndex = 0;
let cameraTracking = false;
let viewer = null;
let lastSatPosition: Cesium.Cartesian3 | null = null;

export function jumpToNextSatellite(viewer: Cesium.Viewer) {
  if (activeSats.length === 0) return;
  const sat = activeSats[chaseSatIndex % activeSats.length];
  chaseSatIndex++;
  cameraTracking = false; // Disable chase cam during manual jumps
  console.log("[Camera] Jumping to satellite index:", chaseSatIndex - 1);
  viewer.camera.flyTo({
    destination: sat.position,
    duration: 1.5,
    maximumHeight: 1e7,
  });
}

export function attachChaseCamera(viewerInstance: Cesium.Viewer) {
  viewer = viewerInstance;
  let cameraFrame = Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY);
  let frameCounter = 0;
  let lastUpdateTime = Date.now();

  // Disable default camera behavior
  viewer.scene.screenSpaceCameraController.enableRotate = false;
  viewer.scene.screenSpaceCameraController.enableTranslate = false;
  viewer.scene.screenSpaceCameraController.enableZoom = false;
  viewer.scene.screenSpaceCameraController.enableTilt = false;
  viewer.scene.screenSpaceCameraController.enableLook = false;

  viewer.homeButton.viewModel.command.beforeExecute.addEventListener(
    function (e) {
      // Only disable chase camera but don't re-enable controls
      // This prevents the camera from jumping back unexpectedly
      cameraTracking = false;

      // Cancel the default home button action and handle it manually
      e.cancel = true;

      // Custom home view that doesn't interfere with chase camera setup
      viewer.camera.flyHome(2.0);
    },
  );

  viewer.scene.preRender.addEventListener(() => {
    if (!cameraTracking || activeSats.length === 0) return;

    // Throttle updates to avoid jitter
    const now = Date.now();
    if (now - lastUpdateTime < 50) return;
    lastUpdateTime = now;

    // Find first active satellite
    let sat = null;
    for (const s of activeSats) {
      if (!s.dead && s.position && s.velocity) {
        sat = s;
        break;
      }
    }

    if (!sat) return;

    // Validate position data
    if (
      !sat.position ||
      !isFinite(sat.position.x) ||
      !isFinite(sat.position.y) ||
      !isFinite(sat.position.z)
    ) {
      console.warn("Invalid satellite position", sat.position);
      return;
    }

    // Only update if position changed or first time
    if (
      !lastSatPosition ||
      !Cesium.Cartesian3.equals(sat.position, lastSatPosition)
    ) {
      try {
        // Create a reference frame based on the satellite's position
        const position = Cesium.Cartesian3.clone(sat.position);
        const up = Cesium.Cartesian3.normalize(
          position,
          new Cesium.Cartesian3(),
        );

        // Use velocity for east direction if available, otherwise compute it
        let east;
        if (sat.velocity && Cesium.Cartesian3.magnitude(sat.velocity) > 0.1) {
          const velocityNorm = Cesium.Cartesian3.normalize(
            sat.velocity,
            new Cesium.Cartesian3(),
          );
          east = Cesium.Cartesian3.cross(
            up,
            velocityNorm,
            new Cesium.Cartesian3(),
          );
          if (Cesium.Cartesian3.magnitude(east) < 0.1) {
            // If velocity is too aligned with up, use a default east
            east = Cesium.Cartesian3.cross(
              up,
              Cesium.Cartesian3.UNIT_Z,
              new Cesium.Cartesian3(),
            );
          }
        } else {
          east = Cesium.Cartesian3.cross(
            up,
            Cesium.Cartesian3.UNIT_Z,
            new Cesium.Cartesian3(),
          );
        }

        east = Cesium.Cartesian3.normalize(east, east);

        // North completes the orthogonal frame
        const north = Cesium.Cartesian3.cross(
          east,
          up,
          new Cesium.Cartesian3(),
        );
        Cesium.Cartesian3.normalize(north, north);

        // Create the reference frame matrix
        cameraFrame = Cesium.Matrix4.fromRotationTranslation(
          Cesium.Matrix3.fromQuaternion(
            Cesium.Quaternion.fromRotationMatrix(
              Cesium.Matrix3.fromColumnMajorArray([
                east.x,
                north.x,
                up.x,
                east.y,
                north.y,
                up.y,
                east.z,
                north.z,
                up.z,
              ]),
            ),
          ),
          position,
        );

        // Apply the reference frame
        viewer.camera.lookAtTransform(cameraFrame);

        // Set the camera orientation relative to the satellite
        const heading = 0;
        const pitch = -0.5;
        const range = 3000;

        viewer.camera.lookAt(
          Cesium.Cartesian3.ZERO,
          new Cesium.HeadingPitchRange(heading, pitch, range),
        );

        lastSatPosition = Cesium.Cartesian3.clone(sat.position);

        const alt = Cesium.Cartesian3.magnitude(sat.position) - 6371000;
        console.log("[Camera] Updated to follow sat. Alt:", alt.toFixed(2));
      } catch (err) {
        console.warn("[Camera] LookAt failed:", err);
      }
    }
  });
}

export function startChaseCamera() {
  cameraTracking = true;
  console.log("[Camera] Chase camera enabled");

  // Ensure camera controls remain disabled when chase camera is enabled
  if (viewer) {
    viewer.scene.screenSpaceCameraController.enableRotate = false;
    viewer.scene.screenSpaceCameraController.enableTranslate = false;
    viewer.scene.screenSpaceCameraController.enableZoom = false;
    viewer.scene.screenSpaceCameraController.enableTilt = false;
    viewer.scene.screenSpaceCameraController.enableLook = false;
  }
}

export function stopChaseCamera(viewer) {
  cameraTracking = false;
  console.log("[Camera] Chase camera disabled");

  // Re-enable camera controls when chase camera is disabled
  if (viewer) {
    viewer.scene.screenSpaceCameraController.enableRotate = true;
    viewer.scene.screenSpaceCameraController.enableTranslate = true;
    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.screenSpaceCameraController.enableTilt = true;
    viewer.scene.screenSpaceCameraController.enableLook = true;
  }
}
