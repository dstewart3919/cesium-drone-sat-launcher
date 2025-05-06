import * as Cesium from 'cesium';
import { vecSafe } from './vecSafe';

export let activeSats: any[] = [];

export function launchSatellites(viewer: Cesium.Viewer, count: number, thrust = 600, burnTime = 5) {
  activeSats = activeSats.filter(s => !s.dead);

  const center = Cesium.Cartesian3.fromDegrees(0, 0, Cesium.Math.nextRandomNumber() * 100 + 10);

  for (let i = 0; i < count; i++) {
    const offset = Cesium.Cartesian3.fromElements(
      Cesium.Math.nextRandomNumber() * 5000,
      Cesium.Math.nextRandomNumber() * 5000,
      0,
      new Cesium.Cartesian3()
    );
    const pos = Cesium.Cartesian3.add(center, offset, new Cesium.Cartesian3());

    const burnVector = vecSafe(
      new Cesium.Cartesian3(
        Cesium.Math.nextRandomNumber() * thrust * 0.3,
        Cesium.Math.nextRandomNumber() * thrust * 0.3,
        thrust
      )
    );

    const entity = viewer.entities.add({
      position: pos,
      point: {
        pixelSize: 8,
        color: Cesium.Color.YELLOW
      }
    });

    const trail = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => trailPositions, false),
        width: 2,
        material: Cesium.Color.YELLOW
      }
    });

    const trailPositions: Cesium.Cartesian3[] = [pos];

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
