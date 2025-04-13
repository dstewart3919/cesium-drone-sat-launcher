import * as Cesium from 'cesium'

interface LayerDefinition {
  name: string
  assetId: number
}

export function applyFilterLogic(
  type: string,
  activeFilter: string | null,
  layers: LayerDefinition[],
  tilesets: Record<number, Cesium.Cesium3DTileset>,
  setVisibleLayers: (vis: Record<number, boolean>) => void,
  setActiveFilter: (type: string | null) => void,
  viewer?: Cesium.Viewer
) {
  const filters = {
    MEP: ['HVAC', 'Plumbing', 'Electrical'],
    ARCH_STRUCT: ['Architectural', 'Structural'],
  }

  const shouldApply = activeFilter !== type
  const newVis: Record<number, boolean> = {}

  layers.forEach(layer => {
    if (layer.name === 'Context') return

    const show = shouldApply ? filters[type]?.includes(layer.name) : true
    const tileset = tilesets[layer.assetId]

    if (tileset) {
      tileset.readyPromise?.then(() => {
        tileset.show = show
        viewer?.scene?.requestRender?.()
      })
      newVis[layer.assetId] = show
    } else {
      console.warn(`Tileset not found for ${layer.name} (ID ${layer.assetId})`)
    }
  })

  setActiveFilter(shouldApply ? type : null)
  setVisibleLayers(newVis)
}
