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
}

export let activeSats: SatData[] = [];

export function launchSatellites(
  viewer: Cesium.Viewer,
  count: number,
  thrust = 600,
  burnTime = 5,
) {
  activeSats = activeSats.filter((s) => !s.dead);

  const center = Cesium.Cartesian3.fromDegrees(
    0,
    0,
    Cesium.Math.nextRandomNumber() * 100 + 10,
  );

  for (let i = 0; i < count; i++) {
    const offset = Cesium.Cartesian3.fromElements(
      Cesium.Math.nextRandomNumber() * 5000,
      Cesium.Math.nextRandomNumber() * 5000,
      0,
      new Cesium.Cartesian3(),
    );
    const pos = Cesium.Cartesian3.add(center, offset, new Cesium.Cartesian3());

    const burnVector = vecSafe(
      new Cesium.Cartesian3(
        Cesium.Math.nextRandomNumber() * thrust * 0.3,
        Cesium.Math.nextRandomNumber() * thrust * 0.3,
        thrust,
      ),
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
