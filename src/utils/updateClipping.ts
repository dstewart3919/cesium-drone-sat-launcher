import * as Cesium from 'cesium'

export function updateClippingPlanes(
  elevation: number,
  tilesets: Record<number, Cesium.Cesium3DTileset>
) {
  Object.values(tilesets).forEach(ts => {
    ts.readyPromise?.then(() => {
      const modelMatrix = ts.root.transform || ts.modelMatrix
      const transformInverse = Cesium.Matrix4.inverse(modelMatrix, new Cesium.Matrix4())

      // Local Z-axis plane at model-space Z = elevation
      const localPlaneNormal = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Z)
      const transformedNormal = Cesium.Matrix3.multiplyByVector(
        Cesium.Matrix4.getMatrix3(transformInverse, new Cesium.Matrix3()),
        localPlaneNormal,
        new Cesium.Cartesian3()
      )

      const transformedPlane = new Cesium.ClippingPlane(
        transformedNormal,
        elevation
      )

      ts.clippingPlanes = new Cesium.ClippingPlaneCollection({
        planes: [transformedPlane],
        unionClippingRegions: true,
        edgeWidth: 1.0,
        edgeColor: Cesium.Color.WHITE
      })

      ts.clippingPlanesEnabled = true
      ts.show = true
    })
  })
}
