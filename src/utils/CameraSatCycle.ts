import { activeSats } from "./launchSat";

export let cameraIndex = 0;
export let cameraActive = false;

export function startChaseCamera() {
  cameraActive = true;
  console.log(`[Camera] Enabled tracking for satellite ${cameraIndex}.`);
}

export function stopChaseCamera() {
  cameraActive = false;
  console.log("[Camera] Chase mode disabled.");
}

export function jumpToNextSatellite() {
  if (!activeSats.length) return;

  cameraActive = true;
  cameraIndex = (cameraIndex + 1) % activeSats.length;

  console.log(`[Camera] Jumped to satellite ${cameraIndex} and ${cameraActive ? "started" : "previewed"} tracking.`);
}
