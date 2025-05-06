import * as Cesium from 'cesium';

/**
 * Returns a safe normalized vector. If the input is near-zero magnitude, it defaults to (0,0,1).
 */
export function vecSafe(vec: Cesium.Cartesian3): Cesium.Cartesian3 {
  const magnitude = Cesium.Cartesian3.magnitude(vec);
  if (magnitude < 1e-6) {
    return new Cesium.Cartesian3(0, 0, 1);
  }
  return Cesium.Cartesian3.normalize(vec, new Cesium.Cartesian3());
}

/**
 * Returns true if the vector is valid (not NaN or near-zero).
 */
export function isValidVec(vec: Cesium.Cartesian3): boolean {
  const mag = Cesium.Cartesian3.magnitude(vec);
  return isFinite(mag) && mag > 1e-6;
}

/**
 * Clones the vector or returns a safe fallback if invalid.
 */
export function safeClone(vec: Cesium.Cartesian3): Cesium.Cartesian3 {
  return isValidVec(vec) ? Cesium.Cartesian3.clone(vec) : new Cesium.Cartesian3(0, 0, 1);
}

/**
 * Adds two vectors safely.
 */
export function safeAdd(a: Cesium.Cartesian3, b: Cesium.Cartesian3): Cesium.Cartesian3 {
  return Cesium.Cartesian3.add(a || new Cesium.Cartesian3(), b || new Cesium.Cartesian3(), new Cesium.Cartesian3());
}

/**
 * Multiplies a vector by a scalar safely.
 */
export function safeMul(vec: Cesium.Cartesian3, scalar: number): Cesium.Cartesian3 {
  return Cesium.Cartesian3.multiplyByScalar(vec || new Cesium.Cartesian3(), scalar, new Cesium.Cartesian3());
}
