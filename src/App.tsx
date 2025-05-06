import { useEffect, useRef, useState } from 'react';
import './App.css';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import { initCesiumViewer } from './utils/initCesiumViewer';
import { launchSatellites, activeSats } from './utils/launchSat';
import { jumpToNextSatellite } from './utils/CameraSatCycle';

const G = 6.67430e-11;
const EARTH_MASS = 5.972e24;
const EARTH_RADIUS = 6.371e6;

// Helpers
const isValidVec = (v?: Cesium.Cartesian3) =>
  Cesium.defined(v) && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

const safeClone = (v?: Cesium.Cartesian3) =>
  isValidVec(v) ? Cesium.Cartesian3.clone(v!) : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);

const safeAdd = (a?: Cesium.Cartesian3, b?: Cesium.Cartesian3) =>
  Cesium.Cartesian3.add(safeClone(a), safeClone(b), new Cesium.Cartesian3());

const safeMul = (v?: Cesium.Cartesian3, s: number = 0) =>
  Number.isFinite(s)
    ? Cesium.Cartesian3.multiplyByScalar(safeClone(v), s, new Cesium.Cartesian3())
    : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);

function App() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<Cesium.Viewer | null>(null);

  const [thrustPower, setThrustPower] = useState(600);
  const [burnTime, setBurnTime] = useState(5);

  useEffect(() => {
    if (!viewerRef.current) return;
    let destroyed = false;

    const setupViewer = async () => {
      const { viewer } = await initCesiumViewer(viewerRef.current!);
      if (destroyed) return;
      viewerInstanceRef.current = viewer;

      viewer.clock.onTick.addEventListener(() => {
        const dt = 1;

        for (const sat of activeSats) {
          if (
            !isValidVec(sat.position) ||
            !isValidVec(sat.velocity) ||
            !isValidVec(sat.acceleration) ||
            !sat.entity ||
            !sat.trailEntity
          ) {
            console.warn("Skipping invalid satellite:", sat);
            continue;
          }

          const rVec = safeClone(sat.position);
          const r = Cesium.Cartesian3.magnitude(rVec);
          if (!Number.isFinite(r) || r === 0) continue;

          const rDir = Cesium.Cartesian3.normalize(rVec, new Cesium.Cartesian3());
          const gravAccel = safeMul(rDir, -G * EARTH_MASS / (r * r));

          const altitude = r - EARTH_RADIUS;
          const drag =
            altitude > 0 && altitude < 100000
              ? safeMul(sat.velocity, -0.000001 * (1 - altitude / 100000))
              : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);

          const burn =
            sat.burnTime > 0
              ? safeClone(sat.acceleration)
              : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);
          if (sat.burnTime > 0) sat.burnTime -= dt;

          const totalAccel = safeAdd(safeAdd(gravAccel, drag), burn);
          sat.velocity = safeAdd(sat.velocity, safeMul(totalAccel, dt));
          sat.position = safeAdd(sat.position, safeMul(sat.velocity, dt));

          const newR = Cesium.Cartesian3.magnitude(sat.position);
          if (newR < EARTH_RADIUS) {
            sat.velocity = Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);
            sat.acceleration = Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);
            sat.position = safeMul(
              Cesium.Cartesian3.normalize(sat.position, new Cesium.Cartesian3()),
              EARTH_RADIUS
            );
          }

          const last = sat.trailPositions[sat.trailPositions.length - 1];
          if (!last || !Cesium.Cartesian3.equals(sat.position, last)) {
            sat.trailPositions.push(Cesium.Cartesian3.clone(sat.position));
            if (sat.trailPositions.length > 300) sat.trailPositions.shift();
          }

          if (sat.trailPositions.length >= 2) {
            sat.trailEntity.polyline!.positions = sat.trailPositions.slice();
          }

          const speed = Cesium.Cartesian3.magnitude(sat.velocity);
          const escapeV = Math.sqrt((2 * G * EARTH_MASS) / (EARTH_RADIUS + altitude));
          if (altitude < 10000 && speed < 100) sat.status = 'crashing';
          else if (speed > escapeV * 1.1) sat.status = 'escaping';
          else sat.status = 'orbiting';

          let color = Cesium.Color.GREEN.withAlpha(0.6);
          if (sat.status === 'crashing') color = Cesium.Color.RED.withAlpha(0.8);
          else if (sat.status === 'escaping') color = Cesium.Color.BLUE.withAlpha(0.6);

          sat.trailEntity.polyline!.material = color;
          sat.entity.position = sat.position;
        }
      });
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
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 100,
          background: 'rgba(0,0,0,0.6)',
          padding: '1em',
          borderRadius: '10px',
          color: '#fff'
        }}
      >
        <div style={{ marginBottom: '0.5em' }}>
          <label htmlFor="thrust">Thrust Power (m/s²): </label>
          <input
            id="thrust"
            type="number"
            placeholder="e.g. 600"
            title="Thrust acceleration upward"
            value={thrustPower}
            onChange={(e) => setThrustPower(Number(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>
        <div style={{ marginBottom: '0.5em' }}>
          <label htmlFor="burn">Burn Time (s): </label>
          <input
            id="burn"
            type="number"
            placeholder="e.g. 5"
            title="How long to apply thrust"
            value={burnTime}
            onChange={(e) => setBurnTime(Number(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>
        <button
          onClick={() =>
            viewerInstanceRef.current &&
            launchSatellites(viewerInstanceRef.current, 10, thrustPower, burnTime)
          }
        >
          Launch 10 Sats
        </button>
        <button
          onClick={() =>
            viewerInstanceRef.current && jumpToNextSatellite(viewerInstanceRef.current)
          }
        >
          Jump to Next Sat
        </button>
      </div>
    </>
  );
}

export default App;
