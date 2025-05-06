import {
  Viewer,
  Cartesian3,
  Color,
  Entity,
} from 'cesium';

export type SatStatus = 'orbiting' | 'crashing' | 'escaping';

export interface SatPhysics {
  position: Cartesian3;
  velocity: Cartesian3;
  acceleration: Cartesian3;
  burnTime: number;
  entity: Entity;
  trailEntity: Entity;
  trailPositions: Cartesian3[];
  status: SatStatus;
}

export const activeSats: SatPhysics[] = [];

export function launchSatellites(
  viewer: Viewer,
  count: number,
  thrustPower: number,
  burnTimeSetting: number
) {
  for (let i = 0; i < count; i++) {
    const lon = -80 + Math.random() * 10;
    const lat = 20 + Math.random() * 10;
    const alt = 0;

    const start = Cartesian3.fromDegrees(lon, lat, alt);
    const angle = Math.random() * Math.PI * 2;
    const thrust = new Cartesian3(
      Math.cos(angle) * 10,
      Math.sin(angle) * 10,
      thrustPower
    );

    const trailPositions: Cartesian3[] = [];

    const trailEntity = viewer.entities.add({
      polyline: {
        positions: trailPositions,
        width: 2,
        material: Color.GRAY.withAlpha(0.5),
      },
    });

    const entity = viewer.entities.add({
      name: `Orbiter ${i + 1}`,
      position: start,
      ellipsoid: {
        radii: new Cartesian3(10000, 10000, 10000),
        material: Color.fromRandom({ alpha: 0.9 }),
      },
    });

    const sat: SatPhysics = {
      position: Cartesian3.clone(start),
      velocity: new Cartesian3(0, 0, 0),
      acceleration: thrust,
      burnTime: burnTimeSetting,
      entity,
      trailEntity,
      trailPositions,
      status: 'orbiting',
    };

    activeSats.push(sat);
  }

  viewer.scene.requestRender();
}
