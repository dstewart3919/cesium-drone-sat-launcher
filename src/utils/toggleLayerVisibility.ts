export function toggleLayerVisibilityHelper(
  assetId: number,
  tilesets: Record<number, any>,
  setVisibleLayers: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
) {
  const tileset = tilesets[assetId]

  if (!tileset) {
    console.warn(`Tileset not found for assetId ${assetId}`)
    return
  }

  setVisibleLayers(prev => {
    const newVisibility = !prev[assetId]

    tileset.readyPromise?.then(() => {
      tileset.show = newVisibility

      // This is key:
      const viewer = tileset._viewer || tileset._scene?._viewer
      viewer?.scene?.requestRender?.()
    })

    return { ...prev, [assetId]: newVisibility }
  })
}
