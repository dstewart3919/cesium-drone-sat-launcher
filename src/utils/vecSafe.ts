import * as Cesium from 'cesium';

/** Return true when the Cartesian3 is defined and all components are finite numbers */
export const isValidVec = (v?: Cesium.Cartesian3): boolean =>
  Cesium.defined(v) &&
  Number.isFinite(v.x) &&
  Number.isFinite(v.y) &&
  Number.isFinite(v.z);

/** Safe clone.  If v is bad, returns Cartesian3.ZERO so Cesium never crashes. */
export const safeClone = (v?: Cesium.Cartesian3): Cesium.Cartesian3 =>
  isValidVec(v) ? Cesium.Cartesian3.clone(v!) : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);

/** Safe add (returns ZERO when either operand is invalid) */
export const safeAdd = (
  a?: Cesium.Cartesian3,
  b?: Cesium.Cartesian3,
): Cesium.Cartesian3 =>
  Cesium.Cartesian3.add(safeClone(a), safeClone(b), new Cesium.Cartesian3());

/** Safe multiply‑by‑scalar (ZERO when vec invalid or scalar non‑finite) */
export const safeMul = (
  v?: Cesium.Cartesian3,
  s: number = 0,
): Cesium.Cartesian3 =>
  Number.isFinite(s)
    ? Cesium.Cartesian3.multiplyByScalar(safeClone(v), s, new Cesium.Cartesian3())
    : Cesium.Cartesian3.clone(Cesium.Cartesian3.ZERO);
