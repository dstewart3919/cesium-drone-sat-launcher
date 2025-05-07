import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./App.css";
import { initCesiumViewer } from "./utils/initCesiumViewer";
import { launchSatellites, activeSats } from "./utils/launchSat";
import {
  jumpToNextSatellite,
  startChaseCamera,
  stopChaseCamera,
  cameraIndex,
  cameraActive,
} from "./utils/CameraSatCycle";
import { vecSafe } from "./utils/vecSafe";

const G = 6.6743e-11;
const EARTH_MASS = 5.972e24;
const EARTH_RADIUS = 6.371e6;

function App() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<Cesium.Viewer | null>(null);
  const [thrustPower, setThrustPower] = useState(600);
  const [burnTime, setBurnTime] = useState(5);

  useEffect(() => {
    if (!viewerRef.current) return;
    let destroyed = false;

    const setupViewer = async () => {
      try {
        const { viewer } = await initCesiumViewer(viewerRef.current!);
        if (destroyed) {
          viewer.destroy();
          return;
        }
        viewerInstanceRef.current = viewer;

        viewer.clock.onTick.addEventListener(() => {
          const dt = 1;
          let needsRender = false;

          for (const sat of activeSats) {
            if (sat.dead || !sat.position || !sat.velocity || !sat.acceleration) continue;
            if (!isFinite(sat.position.x) || !isFinite(sat.position.y) || !isFinite(sat.position.z)) continue;

            const rVec = Cesium.Cartesian3.clone(sat.position);
            const r = Cesium.Cartesian3.magnitude(rVec);
            if (!isFinite(r) || r < 1.0) continue;

            const rDir = vecSafe(rVec);
            const gravScalar = (-G * EARTH_MASS) / (r * r);
            const gravAccel = Cesium.Cartesian3.multiplyByScalar(rDir, gravScalar, new Cesium.Cartesian3());

            const altitude = r - EARTH_RADIUS;
            let drag = new Cesium.Cartesian3(0, 0, 0);
            if (altitude < 100000 && altitude > 0) {
              const dragFactor = 0.000001 * (1 - altitude / 100000);
              drag = Cesium.Cartesian3.multiplyByScalar(sat.velocity, -dragFactor, new Cesium.Cartesian3());
            }

            let burn = new Cesium.Cartesian3(0, 0, 0);
            if (sat.burnTime > 0) {
              burn = sat.acceleration;
              sat.burnTime -= dt;
            }

            const totalAccel = Cesium.Cartesian3.add(
              burn,
              Cesium.Cartesian3.add(gravAccel, drag, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            );

            sat.velocity = Cesium.Cartesian3.add(
              sat.velocity,
              Cesium.Cartesian3.multiplyByScalar(totalAccel, dt, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            );

            const newPosition = Cesium.Cartesian3.add(
              sat.position,
              Cesium.Cartesian3.multiplyByScalar(sat.velocity, dt, new Cesium.Cartesian3()),
              new Cesium.Cartesian3()
            );

            if (!isFinite(newPosition.x) || !isFinite(newPosition.y) || !isFinite(newPosition.z)) continue;

            sat.position = newPosition;
            sat.entity.position = new Cesium.ConstantPositionProperty(sat.position);

            if (sat._positionProp) {
              sat._positionProp.addSample(Cesium.JulianDate.now(), sat.position);
            }

            const newR = Cesium.Cartesian3.magnitude(sat.position);
            if (newR < EARTH_RADIUS) {
              sat.velocity = new Cesium.Cartesian3(0, 0, 0);
              sat.acceleration = new Cesium.Cartesian3(0, 0, 0);
              const safeImpact = Cesium.Cartesian3.multiplyByScalar(
                Cesium.Cartesian3.normalize(sat.position, new Cesium.Cartesian3()),
                EARTH_RADIUS,
                new Cesium.Cartesian3()
              );
              sat.position = safeImpact;
              sat.entity.position = new Cesium.ConstantPositionProperty(safeImpact);
              sat.dead = true;
            }

            const last = sat.trailPositions[sat.trailPositions.length - 1];
            if (!last || Cesium.Cartesian3.distance(sat.position, last) > 50) {
              sat.trailPositions.push(Cesium.Cartesian3.clone(sat.position));
              if (sat.trailPositions.length > 300) sat.trailPositions.shift();
            }

            const speed = Cesium.Cartesian3.magnitude(sat.velocity);
            const escapeV = Math.sqrt((2 * G * EARTH_MASS) / (EARTH_RADIUS + altitude));

            if (altitude < 10000 && speed < 100) {
              sat.status = "crashing";
            } else if (speed > escapeV * 1.1) {
              sat.status = "escaping";
            } else {
              sat.status = "orbiting";
            }

            let color = Cesium.Color.GREEN.withAlpha(0.6);
            if (sat.status === "crashing") color = Cesium.Color.RED.withAlpha(0.8);
            else if (sat.status === "escaping") color = Cesium.Color.BLUE.withAlpha(0.6);

            sat.trailEntity.polyline!.positions = new Cesium.CallbackProperty(() => sat.trailPositions, false);
            sat.trailEntity.polyline!.material = new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: color,
            });

            if (sat.entity.point) {
              sat.entity.point.color = new Cesium.ConstantProperty(color);
            }
            if (sat.entity.ellipsoid) {
              sat.entity.ellipsoid.material = new Cesium.ColorMaterialProperty(color.withAlpha(0.7));
            }

            needsRender = true;
          }

          if (needsRender && viewerInstanceRef.current) {
  // ✅ Manually track camera if chase is active
  if (cameraActive && activeSats[cameraIndex] && !activeSats[cameraIndex].dead) {
    const sat = activeSats[cameraIndex];
    const viewer = viewerInstanceRef.current;
    if (!viewer) return;
  
    const satPos = sat.position;
    const toEarthWorld = Cesium.Cartesian3.negate(satPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(toEarthWorld, toEarthWorld);
    
    // Create ENU transform matrix
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(satPos);
    
    // Invert the transform to convert global vector to local offset
    const invTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());
    const toEarthLocal = Cesium.Matrix4.multiplyByPointAsVector(invTransform, toEarthWorld, new Cesium.Cartesian3());
    
    // Scale back a bit (distance away from satellite)
    const offset = Cesium.Cartesian3.multiplyByScalar(toEarthLocal, -1000.0, new Cesium.Cartesian3());
    
    // Finally look at the satellite with offset pointing toward Earth
    viewerInstanceRef.current.scene.camera.lookAtTransform(transform, offset);
    
  }
  
  
  
  viewerInstanceRef.current.scene.requestRender();
}
        });
      } catch (e) {
        console.error("Cesium viewer setup failed:", e);
      }
    };

    setupViewer();

    return () => {
      destroyed = true;
      if (viewerInstanceRef.current && !viewerInstanceRef.current.isDestroyed()) {
        viewerInstanceRef.current.destroy();
        viewerInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            pointerEvents: "auto",
            background: "rgba(0,0,0,0.8)",
            padding: "1em",
            borderRadius: "10px",
            color: "#fff",
            userSelect: "none",
            WebkitUserSelect: "none",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ marginBottom: "0.5em" }}>
            <label htmlFor="thrust">Thrust Power (m/s²): </label>
            <input
              id="thrust"
              type="number"
              value={thrustPower}
              onChange={(e) => setThrustPower(Number(e.target.value))}
              style={{ width: "60px" }}
            />
          </div>
          <div style={{ marginBottom: "0.5em" }}>
            <label htmlFor="burn">Burn Time (s): </label>
            <input
              id="burn"
              type="number"
              value={burnTime}
              onChange={(e) => setBurnTime(Number(e.target.value))}
              style={{ width: "60px" }}
            />
          </div>
          <button
            onClick={() => {
              if (viewerInstanceRef.current) {
                launchSatellites(viewerInstanceRef.current, 1, thrustPower, burnTime);
              }
            }}
            style={{ marginRight: "0.5em", background: "#2a6d9e", border: "none", padding: "8px 12px" }}
          >
            Launch Satellite
          </button>
          <button
            onClick={() => {
              if (viewerInstanceRef.current) {
                jumpToNextSatellite();
              }
            }}
            style={{ background: "#2a6d9e", border: "none", padding: "8px 12px" }}
          >
            Jump to Next Sat
          </button>
          <div style={{ marginTop: "10px" }}>
            <button
              onClick={() => {
                if (viewerInstanceRef.current) {
                  startChaseCamera();
                }
              }}
              style={{ marginRight: "0.5em", background: "#2a9e6d", border: "none", padding: "8px 12px" }}
            >
              Enable Chase Camera
            </button>
            <button
              onClick={() => {
                stopChaseCamera();
              }}
              style={{ background: "#9e2a2a", border: "none", padding: "8px 12px" }}
            >
              Disable Chase Camera
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
