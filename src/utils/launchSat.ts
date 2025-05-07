import * as Cesium from "cesium";
import { vecSafe } from "./vecSafe";

export interface SatData {
  position: Cesium.Cartesian3;
  velocity: Cesium.Cartesian3;
  acceleration: Cesium.Cartesian3;
  burnTime: number;
  trailEntity: Cesium.Entity;
  trailPositions: Cesium.Cartesian3[];
  entity: Cesium.Entity;
  status: string;
  dead: boolean;

  // ✅ Optional properties for chase camera tracking
  chaseEntity?: Cesium.Entity;
  _positionProp?: Cesium.SampledPositionProperty;
}

export let activeSats: SatData[] = [];

export function launchSatellites(
  viewer: Cesium.Viewer,
  count: number,
  thrust = 600,
  burnTime = 15,
) {
  activeSats = activeSats.filter((s) => !s.dead);

  const LAUNCH_LON = -80.0;
  const LAUNCH_LAT = 0.0;
  const LAUNCH_ALT = 1000;

  const center = Cesium.Cartesian3.fromDegrees(
    LAUNCH_LON,
    LAUNCH_LAT,
    LAUNCH_ALT + Cesium.Math.nextRandomNumber() * 50,
  );

  for (let i = 0; i < count; i++) {
    const offset = Cesium.Cartesian3.fromElements(
      Cesium.Math.nextRandomNumber() * 5000,
      Cesium.Math.nextRandomNumber() * 5000,
      0,
      new Cesium.Cartesian3(),
    );
    const pos = Cesium.Cartesian3.add(center, offset, new Cesium.Cartesian3());

    // Surface normal (up)
    const surfaceNormal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(pos);

    // Local east vector (perpendicular to normal)
    const eastVec = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, surfaceNormal, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    // Launch direction: 60% up, 80% east
    const launchDir = Cesium.Cartesian3.add(
      Cesium.Cartesian3.multiplyByScalar(surfaceNormal, 0.6, new Cesium.Cartesian3()),
      Cesium.Cartesian3.multiplyByScalar(eastVec, 0.8, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );

    const burnVector = Cesium.Cartesian3.multiplyByScalar(
      vecSafe(launchDir),
      thrust,
      new Cesium.Cartesian3()
    );

    const trailPositions: Cesium.Cartesian3[] = [pos];

    const entity = viewer.entities.add({
      position: new Cesium.ConstantPositionProperty(pos),
      point: {
        pixelSize: 8,
        color: Cesium.Color.YELLOW,
      },
      ellipsoid: {
        radii: new Cesium.Cartesian3(500, 500, 500),
        material: Cesium.Color.YELLOW.withAlpha(0.7),
        show: true,
      },
    });

    const trail = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return trailPositions.length > 1
            ? trailPositions
            : [
                pos,
                Cesium.Cartesian3.add(
                  pos,
                  new Cesium.Cartesian3(1, 1, 1),
                  new Cesium.Cartesian3(),
                ),
              ];
        }, false),
        width: 3,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: Cesium.Color.YELLOW,
        }),
        show: true,
      },
    });

    activeSats.push({
      position: pos,
      velocity: new Cesium.Cartesian3(0, 0, 0),
      acceleration: burnVector,
      burnTime,
      trailEntity: trail,
      trailPositions,
      entity,
      status: "idle",
      dead: false,
    });
  }

  viewer.scene.requestRender();
}
