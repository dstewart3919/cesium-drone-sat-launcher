import { useEffect, useRef, useState } from 'react';
import './App.css';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import { initCesiumViewer } from './utils/initCesiumViewer';
import { launchSatellites, activeSats } from './utils/launchSat';
import { jumpToNextSatellite, attachChaseCamera, startChaseCamera } from './utils/CameraSatCycle';
import { vecSafe } from './utils/vecSafe';

const G = 6.67430e-11;
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
      const { viewer } = await initCesiumViewer(viewerRef.current!);
      if (destroyed) return;
      viewerInstanceRef.current = viewer;

      startChaseCamera();
      attachChaseCamera(viewer);

      viewer.clock.onTick.addEventListener(() => {
        const dt = 1;
        let needsRender = false;

        for (const sat of activeSats) {
          if (sat.dead || !sat.position || !sat.velocity || !sat.acceleration) continue;

          const rVec = Cesium.Cartesian3.clone(sat.position);
          const r = Cesium.Cartesian3.magnitude(rVec);
          if (!isFinite(r) || r < 1.0) {
            console.warn('Invalid r:', r, 'pos:', sat.position);
            continue;
          }

          const rDir = vecSafe(rVec);
          const gravScalar = -G * EARTH_MASS / (r * r);
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

          sat.position = Cesium.Cartesian3.add(
            sat.position,
            Cesium.Cartesian3.multiplyByScalar(sat.velocity, dt, new Cesium.Cartesian3()),
            new Cesium.Cartesian3()
          );

          sat.entity.position = sat.position;

          const newR = Cesium.Cartesian3.magnitude(sat.position);
          if (newR < EARTH_RADIUS) {
            console.log('Satellite impacted Earth and is now dead.');
            sat.velocity = new Cesium.Cartesian3(0, 0, 0);
            sat.acceleration = new Cesium.Cartesian3(0, 0, 0);
            sat.position = Cesium.Cartesian3.multiplyByScalar(
              Cesium.Cartesian3.normalize(sat.position, new Cesium.Cartesian3()),
              EARTH_RADIUS
            );
            sat.entity.position = sat.position;
            sat.dead = true;
          }

          const last = sat.trailPositions[sat.trailPositions.length - 1];
          if (!last || !Cesium.Cartesian3.equals(sat.position, last)) {
            sat.trailPositions.push(Cesium.Cartesian3.clone(sat.position));
            if (sat.trailPositions.length > 300) sat.trailPositions.shift();
          }

          const speed = Cesium.Cartesian3.magnitude(sat.velocity);
          const escapeV = Math.sqrt((2 * G * EARTH_MASS) / (EARTH_RADIUS + altitude));

          if (altitude < 10000 && speed < 100) {
            sat.status = 'crashing';
          } else if (speed > escapeV * 1.1) {
            sat.status = 'escaping';
          } else {
            sat.status = 'orbiting';
          }

          console.log('Sat status:', sat.status, 'alt:', altitude.toFixed(1), 'speed:', speed.toFixed(1));

          let color = Cesium.Color.GREEN.withAlpha(0.6);
          if (sat.status === 'crashing') color = Cesium.Color.RED.withAlpha(0.8);
          else if (sat.status === 'escaping') color = Cesium.Color.BLUE.withAlpha(0.6);

          sat.trailEntity.polyline!.material = color;
          sat.entity.point!.color = color;

          needsRender = true;
        }

        if (needsRender) viewer.scene.requestRender();
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

      <div style={{
        position: 'absolute', top: 20, left: 20, zIndex: 100,
        background: 'rgba(0,0,0,0.6)', padding: '1em', borderRadius: '10px', color: '#fff',
        userSelect: 'none', WebkitUserSelect: 'none'
      }}>
        <div style={{ marginBottom: '0.5em' }}>
          <label htmlFor="thrust">Thrust Power (m/s²): </label>
          <input
            id="thrust"
            type="number"
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
            value={burnTime}
            onChange={(e) => setBurnTime(Number(e.target.value))}
            style={{ width: '60px' }}
          />
        </div>
        <button
          onClick={() => viewerInstanceRef.current &&
            launchSatellites(viewerInstanceRef.current, 10, thrustPower, burnTime)}
          style={{ marginRight: '0.5em' }}
        >
          Launch 10 Sats
        </button>
        <button onClick={() => viewerInstanceRef.current && jumpToNextSatellite(viewerInstanceRef.current)}>
          Jump to Next Sat
        </button>
      </div>
    </>
  );
}

export default App;