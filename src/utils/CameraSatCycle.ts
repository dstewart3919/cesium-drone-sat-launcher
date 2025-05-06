import { Viewer } from 'cesium';
import { activeSats } from './launchSat';

let currentIndex = 0;

export function jumpToNextSatellite(viewer: Viewer) {
  if (activeSats.length === 0) return;

  currentIndex = (currentIndex + 1) % activeSats.length;
  const target = activeSats[currentIndex];

  viewer.flyTo(target.entity, {
    duration: 2,
    offset: {
      heading: 0,
      pitch: -0.5,
      range: 100000,
    },
  });
}
