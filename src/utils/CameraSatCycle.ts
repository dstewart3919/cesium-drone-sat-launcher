import { Viewer, Cartesian3, Transforms, Matrix4 } from 'cesium';
import { activeSats } from './launchSat';

let currentIndex = -1;

export function jumpToNextSatellite(viewer: Viewer) {
  if (activeSats.length === 0) return;

  currentIndex = (currentIndex + 1) % activeSats.length;
  const sat = activeSats[currentIndex];
  if (!sat || !sat.position) return;

  const position = Cartesian3.clone(sat.position);
  const transform = Transforms.eastNorthUpToFixedFrame(position);
  viewer.camera.lookAtTransform(transform, new Cartesian3(0, -50000, 10000));
}
