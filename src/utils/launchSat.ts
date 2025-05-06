import * as Cesium from 'cesium';

export interface Satellite {
  entity: Cesium.Entity;
  trailEntity: Cesium.Entity;
  position: Cesium.Cartesian3;
  velocity: Cesium.Cartesian3;
  acceleration: Cesium.Cartesian3;
  burnTime: number;
  status: 'orbiting' | 'escaping' | 'crashing';
  trailPositions: Cesium.Cartesian3[];
  dead?: boolean;
}

export const activeSats: Satellite[] = [];

export function launchSatellites(
  viewer: Cesium.Viewer,
  count: number,
  thrustPower: number = 600,
  burnDuration: number = 5
) {
  for (let i = 0; i < count; i++) {
    const lon = -80 + Math.random() * 2;
    const lat = 0 + Math.random() * 2;
    const height = 0;

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);

    const up = Cesium.Cartesian3.normalize(position, new Cesium.Cartesian3());
    const skew = Cesium.Cartesian3.fromElements(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
    const acceleration = Cesium.Cartesian3.add(
      Cesium.Cartesian3.multiplyByScalar(up, thrustPower, new Cesium.Cartesian3()),
      skew,
      new Cesium.Cartesian3()
    );

    const satEntity = viewer.entities.add({
      position: position,
      point: {
        pixelSize: 8,
        color: Cesium.Color.YELLOW.withAlpha(0.9),
        heightReference: Cesium.HeightReference.NONE,
      },
    });

    const trailEntity = viewer.entities.add({
      polyline: {
        positions: [],
        width: 1.5,
        material: Cesium.Color.GREEN.withAlpha(0.6),
        clampToGround: false,
      },
    });

    const sat: Satellite = {
      entity: satEntity,
      trailEntity,
      position,
      velocity: new Cesium.Cartesian3(0, 0, 0),
      acceleration,
      burnTime: burnDuration,
      status: 'orbiting',
      trailPositions: [Cesium.Cartesian3.clone(position)],
    };

    activeSats.push(sat);
  }
}
