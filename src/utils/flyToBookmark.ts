import * as Cesium from 'cesium'

export const anchor = { lon: -79.886646, lat: 40.022376 }

// Set to true to console.log everything during development
const DEBUG = true

// If your bookmarks assume glTF-style Y-forward model space,
// set this to true to remap Y-forward to Cesium ENU (X-east, Y-north)
const USE_Y_FORWARD = true

export async function flyToBookmark(bookmark, viewer: Cesium.Viewer) {
  const offset = bookmark.position || { x: 0, y: 0, z: 0 }
  const rot = bookmark.rotation || { x: 0, y: 0, z: 0 }

  // Convert offset if authored in glTF-style Y-forward model space
  const localOffset = USE_Y_FORWARD
    ? new Cesium.Cartesian3(offset.y, -offset.x, offset.z) // Y-forward -> ENU
    : new Cesium.Cartesian3(offset.x, offset.y, offset.z)

  // Step 1: Get base position (model origin in world space)
  const baseCarto = Cesium.Cartographic.fromDegrees(anchor.lon, anchor.lat)
  await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [baseCarto])
  const height = baseCarto.height
  const modelOrigin = Cesium.Cartesian3.fromDegrees(anchor.lon, anchor.lat, height)

  // Step 2: Create model's world matrix (ENU)
  let modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(modelOrigin)

  // Step 3: Apply any fixed model rotation (+26.02 degrees)
  const modelRotation = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(26.02))
  Cesium.Matrix4.multiplyByMatrix3(modelMatrix, modelRotation, modelMatrix)

  // Step 4: Convert local offset to world-space position
  const destination = Cesium.Matrix4.multiplyByPoint(modelMatrix, localOffset, new Cesium.Cartesian3())

  // Step 5: Apply camera orientation, adjusting for model alignment
  const heading = Cesium.Math.toRadians(rot.y + 26.02) // match model-facing direction
  const pitch = Cesium.Math.toRadians(rot.x)
  const roll = Cesium.Math.toRadians(rot.z)

  if (DEBUG) {
    console.log('[flyToBookmark]')
    console.table({
      'Offset (local)': JSON.stringify(offset),
      'Offset (ENU)': JSON.stringify(localOffset),
      'Anchor': `${anchor.lon}, ${anchor.lat}`,
      'Model Height': height,
      'Heading (+26.02)': heading,
      'Pitch': pitch,
      'Destination': destination.toString()
    })
  }

  viewer.camera.flyTo({
    destination,
    orientation: { heading, pitch, roll },
    duration: 1.5
  })
}
