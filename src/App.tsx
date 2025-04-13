import { useEffect, useRef, useState } from 'react'
import './App.css'
import * as Cesium from 'cesium'
import "cesium/Build/Cesium/Widgets/widgets.css"
import bookmarksData from './data/bookmarks.json'
import clippingData from './data/clipping-planes.json'

import { flyToBookmark } from './utils/flyToBookmark'
import { initCesiumViewer } from './utils/initCesiumViewer'
import waitForCanvasReady from './utils/waitForCanvasReady'
import { applyFilterLogic } from './utils/applyFiliter'
import { toggleLayerVisibilityHelper } from './utils/toggleLayerVisibility'
import { updateClippingPlanes } from './utils/updateClipping'

import Sidebar from './components/Sidebar'

interface LayerDefinition {
  name: string
  assetId: number
  color?: string
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
}

function App() {
  const viewerRef = useRef<HTMLDivElement>(null)
  const viewerInstanceRef = useRef<Cesium.Viewer | null>(null)
  const [layers, setLayers] = useState<LayerDefinition[]>([])
  const [tilesets, setTilesets] = useState<Record<number, Cesium.Cesium3DTileset>>({})
  const [visibleLayers, setVisibleLayers] = useState<Record<number, boolean>>({})
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [clippingElevation, setClippingElevation] = useState<number>(0)
  const [sections, setSections] = useState({
    locations: false,
    filters: false,
    clipping: false
  })

  const toggleSection = (key: keyof typeof sections) =>
    setSections(prev => ({ ...prev, [key]: !prev[key] }))

  const updateClipping = (elevation: number) => {
    setClippingElevation(elevation)
    updateClippingPlanes(tilesets, elevation)
    viewerInstanceRef.current?.scene?.requestRender()
  }

  const toggleLayerVisibility = (assetId: number) => {
    toggleLayerVisibilityHelper(assetId, tilesets, setVisibleLayers)
    viewerInstanceRef.current?.scene?.requestRender()
  }

  const applyFilter = (type: string) => {
    applyFilterLogic(
      type,
      activeFilter,
      layers,
      tilesets,
      setVisibleLayers,
      setActiveFilter,
      viewerInstanceRef.current
    )
  }

  useEffect(() => {
    if (!viewerRef.current) return
    let destroyed = false

    const setupViewer = async () => {
      await waitForCanvasReady(viewerRef.current)

      const { viewer, tilesets, visibleLayers } = await initCesiumViewer(viewerRef.current!)
      if (destroyed) {
        viewer.destroy()
        return
      }

      viewerInstanceRef.current = viewer
      setTilesets(tilesets)
      setVisibleLayers(visibleLayers)

      const { default: loadedLayers } = await import('./data/layers.json')
      setLayers(loadedLayers)
    }

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(setupViewer)
    } else {
      setTimeout(setupViewer, 0)
    }

    return () => {
      destroyed = true
      if (viewerInstanceRef.current && !viewerInstanceRef.current.isDestroyed()) {
        viewerInstanceRef.current.destroy()
        viewerInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <Sidebar
        sections={sections}
        toggleSection={toggleSection}
        handleBookmarkClick={(name) => {
          const bookmark = bookmarksData.find(b => b.name === name)
          if (bookmark && viewerInstanceRef.current) {
            flyToBookmark(bookmark, viewerInstanceRef.current)
          }
        }}
        layers={layers}
        visibleLayers={visibleLayers}
        toggleLayerVisibility={toggleLayerVisibility}
        setVisibleLayers={setVisibleLayers}
        tilesets={tilesets}
        setActiveFilter={setActiveFilter}
        updateClipping={updateClipping}
        clippingData={clippingData}
        clippingElevation={clippingElevation}
      />
      <div ref={viewerRef} style={{ height: '96%', width: '70%', overflow: 'hidden' }} />
    </div>
  )
}

export default App
