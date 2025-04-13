import * as Cesium from 'cesium'
import layersData from '../data/layers.json'

export async function initCesiumViewer(container: HTMLElement): Promise<{
  viewer: Cesium.Viewer,
  tilesets: Record<number, Cesium.Cesium3DTileset>,
  visibleLayers: Record<number, boolean>
}> {
  Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

  const terrain = await Cesium.createWorldTerrainAsync()

  const viewer = new Cesium.Viewer(container, {
    terrainProvider: terrain,
    contextOptions: {
      webgl: {
        preserveDrawingBuffer: true
      }
    },
    baseLayerPicker: true,
    timeline: false,
    animation: false,
    navigationHelpButton: true,
    homeButton: true,
    geocoder: true,
    sceneModePicker: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: false,
    requestRenderMode: true,
  })

  await viewer.scene.completeMorph()
  await viewer.scene.globe.readyPromise

  viewer.scene.globe.baseColor = Cesium.Color.DARKGRAY
  viewer.scene.globe.depthTestAgainstTerrain = true
  viewer.scene.light = new Cesium.SunLight()
  window.dispatchEvent(new Event('resize'))

  const anchor = Cesium.Cartesian3.fromDegrees(-79.886646, 40.022376, 300)
  viewer.scene.camera.setView({ destination: anchor })

  viewer.trackedEntity = undefined
  viewer.camera.cancelFlight()

  viewer.zoomTo = () => {
    console.warn("Blocked viewer.zoomTo to prevent unexpected camera reset.")
    return Promise.resolve()
  }

  viewer.geocoder.viewModel.destinationFound = vm => {
    viewer.camera.flyTo({
      destination: vm.destination,
      duration: 2
    })
  }

  // Optional: Load Google Photorealistic Tiles
  setTimeout(() => {
    Cesium.IonResource.fromAssetId(2275207)
      .then(resource => Cesium.Cesium3DTileset.fromUrl(resource))
      .then(tileset => {
        tileset.show = true
        tileset.maximumScreenSpaceError = 64
        tileset.dynamicScreenSpaceError = true
        if (!tileset.isDestroyed()) {
          viewer.scene.primitives.add(tileset)
        }
      })
      .catch(err => console.warn('Google 3D Tiles failed to load', err))
  }, 2000)

  const tilesets: Record<number, Cesium.Cesium3DTileset> = {}
  const visibleLayers: Record<number, boolean> = {}

  for (const layer of layersData) {
    try {
      const resource = await Cesium.IonResource.fromAssetId(layer.assetId)
      const tileset = await Cesium.Cesium3DTileset.fromUrl(resource)
      await tileset.readyPromise

      if (layer.color) {
        tileset.style = new Cesium.Cesium3DTileStyle({
          color: `color('${layer.color}', 0.8)`
        })
      }

      const pos = layer.position || { x: 0, y: 0, z: 0 }
      const rot = layer.rotation || { x: 0, y: 0, z: 0 }

      const lon = -79.886646 + pos.x
      const lat = 40.022376 + pos.y
      const positionCarto = Cesium.Cartographic.fromDegrees(lon, lat)

      await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [positionCarto])
      const height = positionCarto.height + pos.z
      const position = Cesium.Cartesian3.fromDegrees(lon, lat, height)

      const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)
      const rotationY = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rot.y + 26.02))
      Cesium.Matrix4.multiplyByMatrix3(matrix, rotationY, matrix)

      tileset.modelMatrix = matrix
      tileset.show = layer.name !== 'Context'

      if (!tileset.isDestroyed()) {
        viewer.scene.primitives.add(tileset)
      }

      // Attach viewer reference for utils that use it
      (tileset as any)._viewer = viewer

      tilesets[layer.assetId] = tileset
      visibleLayers[layer.assetId] = tileset.show

    } catch (err) {
      console.error(`Failed to load layer ${layer.name}`, err)
    }
  }

  return { viewer, tilesets, visibleLayers }
}
