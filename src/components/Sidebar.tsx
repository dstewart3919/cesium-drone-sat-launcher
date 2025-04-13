import React from 'react'
import bookmarksData from '../data/bookmarks.json'

interface SidebarProps {
  sections: { locations: boolean; filters: boolean; clipping: boolean }
  toggleSection: (key: keyof SidebarProps['sections']) => void
  handleBookmarkClick: (name: string) => void
  layers: any[]
  visibleLayers: Record<number, boolean>
  toggleLayerVisibility: (assetId: number) => void
  setVisibleLayers: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  tilesets: Record<number, any>
  setActiveFilter: React.Dispatch<React.SetStateAction<string | null>>
  updateClipping: (elevation: number) => void
  clippingData: any
  clippingElevation: number
}

const Sidebar: React.FC<SidebarProps> = ({
  sections,
  toggleSection,
  handleBookmarkClick,
  layers,
  visibleLayers,
  toggleLayerVisibility,
  setVisibleLayers,
  tilesets,
  setActiveFilter,
  updateClipping,
  clippingData,
  clippingElevation
}) => {
  return (
    <div className="sidebar">

      <button onClick={() => toggleSection('locations')}><strong>📌 Locations</strong></button>
      {sections.locations && (
        <>
          {bookmarksData.map(b => (
            <button key={b.name} onClick={() => handleBookmarkClick(b.name)}>
              {b.name}
            </button>
          ))}
        </>
      )}

      <button onClick={() => toggleSection('filters')}><strong>🎛️ Filters</strong></button>
      {sections.filters && layers.length > 0 && (
        <>
          {layers.filter(l => l.name !== 'Context').map(layer => (
            <button
              key={layer.assetId}
              onClick={() => toggleLayerVisibility(layer.assetId)}
              className={visibleLayers[layer.assetId] ? 'bold' : ''}
            >
              {visibleLayers[layer.assetId] ? 'Hide' : 'Show'} {layer.name}
            </button>
          ))}

          <button onClick={() => {
            const nonContextLayers = layers.filter(l => l.name !== 'Context')
            const allVisible = Object.fromEntries(nonContextLayers.map(layer => [layer.assetId, true]))

            nonContextLayers.forEach(layer => {
              tilesets[layer.assetId]?.readyPromise?.then(() => {
                tilesets[layer.assetId].show = true
              })
            })

            setVisibleLayers(allVisible)
            setActiveFilter(null)
          }}>
            Reset
          </button>
        </>
      )}

      <button onClick={() => toggleSection('clipping')}><strong>✂️ Clipping Planes</strong></button>
      {sections.clipping && (
        <div>
          {clippingData.presets.map(p => (
            <button key={p.name} onClick={() => updateClipping(p.elevation)}>
              {p.name}
            </button>
          ))}
          <div>
            <button onClick={() => updateClipping(clippingElevation + 1)}>▲</button>
            <button onClick={() => updateClipping(clippingElevation - 1)}>▼</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
