import * as Cesium from 'cesium';
import { vecSafe } from './vecSafe';

export let activeSats: any[] = [];

export function launchSatellites(viewer: Cesium.Viewer, count: number, thrust = 600, burnTime = 5) {
  activeSats = activeSats.filter(s => !s.dead);

  for (let i = 0; i < count; i++) {
    // Pick a random launch position ~1km above surface
    const lat = Cesium.Math.nextRandomNumber() * 180 - 90;
    const lon = Cesium.Math.nextRandomNumber() * 360 - 180;
    const surface = Cesium.Cartesian3.fromDegrees(lon, lat);
    const up = vecSafe(surface);
    const center = Cesium.Cartesian3.multiplyByScalar(up, 6371000 + 1000, new Cesium.Cartesian3()); // Earth radius + 1km

    // Tangent vector for angle offset
    const tangent = Cesium.Cartesian3.cross(up, Cesium.Cartesian3.UNIT_Y, new Cesium.Cartesian3());

    // Launch direction between 45–90° from up vector
    const angle = Cesium.Math.toRadians(45 + Cesium.Math.nextRandomNumber() * 45);
    const burnDir = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(up, Math.cos(angle), new Cesium.Cartesian3()),
        Cesium.Cartesian3.multiplyByScalar(tangent, Math.sin(angle), new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      ),
      new Cesium.Cartesian3()
    );

    const burnVector = Cesium.Cartesian3.multiplyByScalar(burnDir, thrust, new Cesium.Cartesian3());

    const pos = Cesium.Cartesian3.clone(center);

    const entity = viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 8,
        color: Cesium.Color.YELLOW
      }
    });

    const trailPositions: Cesium.Cartesian3[] = [pos];
    const trail = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => trailPositions, false),
        width: 2,
        material: Cesium.Color.YELLOW
      }
    });

    activeSats.push({
      position: pos,
      velocity: new Cesium.Cartesian3(0, 0, 0),
      acceleration: burnVector,
      burnTime,
      trailEntity: trail,
      trailPositions,
      entity,
      status: 'idle',
      dead: false
    });
  }

  viewer.scene.requestRender();
}
