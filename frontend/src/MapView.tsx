
import { useEffect, useRef, useState } from 'react'

type Site = {
  id: number
  name: string
  commune: string
  risk: string
  latitude: string
  longitude: string
}

type MapEvent = {
  latlng: { lat: number; lng: number }
}

type GeoFeature = {
  type?: string
  properties?: {
    shapeName?: string
  }
  geometry?: {
    type: string
    coordinates: unknown
  }
}

type GeoJSONData = {
  type: string
  features: GeoFeature[]
}

type LeafletLayer = {
  addTo: (map: LeafletMap | LeafletLayerGroup) => LeafletLayer
  bindPopup: (content: string) => LeafletLayer
  bindTooltip: (content: string, options?: object) => LeafletLayer
  bringToFront: () => LeafletLayer
  getBounds: () => unknown
}

type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup
  clearLayers: () => void
}

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap
  fitBounds: (bounds: unknown, options?: object) => LeafletMap
  on: (event: string, callback: (e: MapEvent) => void) => void
  remove: () => void
  invalidateSize: () => void
}

type Leaflet = {
  map: (element: HTMLElement, options?: object) => LeafletMap
  tileLayer: (url: string, options: object) => LeafletLayer
  layerGroup: () => LeafletLayerGroup
  circleMarker: (position: [number, number], options: object) => LeafletLayer
  geoJSON: (
    data: GeoJSONData,
    options: {
      style?: object
      pane?: string
      onEachFeature?: (feature: GeoFeature, layer: LeafletLayer) => void
    }
  ) => LeafletLayer
}

type MapViewProps = {
  sites: Site[]
  selectingLocation: boolean
  onLocationSelect: (latitude: string, longitude: string) => void
}

function getLeaflet(): Leaflet | undefined {
  return (window as Window & { L?: Leaflet }).L
}

function loadLeaflet(): Promise<Leaflet> {
  return new Promise((resolve, reject) => {
    const existing = getLeaflet()

    if (existing) {
      resolve(existing)
      return
    }

    let css = document.getElementById('leaflet-css') as HTMLLinkElement | null

    if (!css) {
      css = document.createElement('link')
      css.id = 'leaflet-css'
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(css)
    }

    let script = document.getElementById('leaflet-js') as HTMLScriptElement | null

    if (script) {
      const checkLeaflet = () => {
        const L = getLeaflet()
        if (L) resolve(L)
        else reject(new Error('لم يتم تحميل مكتبة الخرائط'))
      }

      script.addEventListener('load', checkLeaflet, { once: true })
      script.addEventListener(
        'error',
        () => reject(new Error('تعذر تحميل مكتبة الخرائط')),
        { once: true }
      )

      if (getLeaflet()) checkLeaflet()
      return
    }

    script = document.createElement('script')
    script.id = 'leaflet-js'
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

    script.onload = () => {
      const L = getLeaflet()
      if (L) resolve(L)
      else reject(new Error('لم يتم تحميل مكتبة الخرائط بشكل صحيح'))
    }

    script.onerror = () => reject(new Error('تعذر الاتصال بمكتبة الخرائط'))

    document.body.appendChild(script)
  })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return entities[char]
  })
}

const communeNames: Record<string, string> = {
  Zemmora: 'زمورة',
  Yellel: 'يلل',
  'Souk El Had': 'سوق الحد',
  'Sidi Saada': 'سيدي سعادة',
  "Sidi M'Hamed Benaouda": 'سيدي امحمد بن عودة',
  "Sidi M'Hamed Ben Ali": 'سيدي امحمد بن علي',
  'Sidi Lazreg': 'سيدي لزرق',
  'Sidi Khettab': 'سيدي خطاب',
  Relizane: 'غليزان',
  Ramka: 'الرمكة',
  'Ouled Aiche': 'أولاد عايش',
  'Ouled Sidi Mihoub': 'أولاد سيدي الميهوب',
  'Oued Rhiou': 'وادي رهيو',
  'Oued Essalem': 'وادي السلام',
  'Oued El Djemaa': 'وادي الجمعة',
  Ouarizane: 'واريزان',
  'Merdja Sidi Abed': 'مرجة سيدي عابد',
  Mendes: 'منداس',
  Mediouna: 'مديونة',
  Mazouna: 'مازونة',
  Lahlef: 'لحلاف',
  Kalaa: 'القلعة',
  Hamri: 'حمري',
  'Had Echkalla': 'حد الشكالة',
  'El Ouldja': 'الولجة',
  'El Matmar': 'المطمر',
  'El Hassi': 'الحاسي',
  'El Hamadna': 'الحمادنة',
  'El Guettar': 'القطار',
  Djdiouia: 'جديوية',
  'Dar Ben Abdellah': 'دار بن عبد الله',
  'Beni Zentis': 'بني زنطيس',
  'Beni Dergoun': 'بني درقون',
  Bendaoud: 'بن داود',
  'Belassel Bouzegza': 'بلعسل بوزقزة',
  'Ammi Moussa': 'عمي موسى',
}

export default function MapView({
  sites,
  selectingLocation,
  onLocationSelect,
}: MapViewProps) {
  const mapElement = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<LeafletLayerGroup | null>(null)
  const selectingRef = useRef(selectingLocation)
  const callbackRef = useRef(onLocationSelect)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [mapStatus, setMapStatus] = useState('جارٍ تحميل الخريطة...')

  useEffect(() => {
    selectingRef.current = selectingLocation
    callbackRef.current = onLocationSelect
  }, [selectingLocation, onLocationSelect])

  useEffect(() => {
    let cancelled = false

    async function initializeMap() {
      try {
        setMapStatus('جارٍ تحميل مكتبة الخرائط...')

        const L = await loadLeaflet()

        if (cancelled || !mapElement.current) return

        const map = L.map(mapElement.current).setView([35.737, 0.555], 9)
        mapRef.current = map

        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles © Esri',
            maxZoom: 19,
          }
        ).addTo(map)

        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Labels © Esri',
            maxZoom: 19,
          }
        ).addTo(map)

        markersRef.current = L.layerGroup().addTo(map)

        map.on('click', (event) => {
          if (selectingRef.current) {
            callbackRef.current(
              event.latlng.lat.toFixed(6),
              event.latlng.lng.toFixed(6)
            )
          }
        })

        setMapStatus('جارٍ تحميل حدود البلديات الـ36...')

        const response = await fetch('/relizane-communes.geojson', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`تعذر تحميل ملف البلديات: ${response.status}`)
        }

        const geoData = (await response.json()) as GeoJSONData

        if (
          !geoData ||
          geoData.type !== 'FeatureCollection' ||
          !Array.isArray(geoData.features) ||
          geoData.features.length !== 36
        ) {
          throw new Error('ملف GeoJSON لا يحتوي على البلديات الـ36 المطلوبة.')
        }

        if (cancelled) return

        const whiteOutline = L.geoJSON(geoData, {
          pane: 'overlayPane',
          style: {
            color: '#ffffff',
            weight: 6,
            opacity: 0.95,
            fillOpacity: 0,
          },
        })

        whiteOutline.addTo(map)

        const communeLayer = L.geoJSON(geoData, {
          pane: 'overlayPane',
          style: {
            color: '#00ff35',
            weight: 3,
            opacity: 1,
            fillColor: '#22c55e',
            fillOpacity: 0.08,
          },

          onEachFeature: (feature, layer) => {
            const englishName = feature.properties?.shapeName?.trim() || ''
            const arabicName = communeNames[englishName] || englishName

            if (!arabicName) return

            layer.bindTooltip(escapeHtml(arabicName), {
              permanent: true,
              direction: 'center',
              className: 'commune-name-tooltip',
              opacity: 1,
              interactive: false,
            })
          },
        })

        communeLayer.addTo(map)
        communeLayer.bringToFront()

        map.fitBounds(communeLayer.getBounds(), {
          padding: [25, 25],
          maxZoom: 10,
        })

        map.invalidateSize()

        if (!cancelled) {
          setReady(true)
          setError('')
          setMapStatus(`تم تحميل حدود البلديات بنجاح: ${geoData.features.length} بلدية`)
        }
      } catch (err) {
        console.error('Map initialization error:', err)

        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل الخريطة'
          )
          setMapStatus('تعذر تحميل حدود البلديات')
        }
      }
    }

    initializeMap()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !markersRef.current) return

    const L = getLeaflet()
    if (!L) return

    const layer = markersRef.current
    layer.clearLayers()

    sites.forEach((site) => {
      if (!site.latitude?.trim() || !site.longitude?.trim()) return

      const latitude = Number(site.latitude)
      const longitude = Number(site.longitude)

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return
      }

      const color =
        site.risk === 'حرج'
          ? '#7b1e1e'
          : site.risk === 'مرتفع'
            ? '#dc2626'
            : site.risk === 'متوسط'
              ? '#f59e0b'
              : '#16a34a'

      const popup = `
        <div style="direction:rtl;text-align:right;min-width:130px">
          <strong>${escapeHtml(site.name)}</strong>
          <br />
          البلدية: ${escapeHtml(site.commune)}
          <br />
          مستوى الخطر:
          <strong style="color:${color}">
            ${escapeHtml(site.risk)}
          </strong>
        </div>
      `

      L.circleMarker([latitude, longitude], {
        radius: 9,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(popup)
        .addTo(layer)
    })
  }, [sites, ready])

  return (
    <div style={{ width: '100%', direction: 'rtl' }}>
      {selectingLocation && (
        <div className="map-select-message">
          انقري على الخريطة لتحديد موقع المفرغة
        </div>
      )}

      <div
        style={{
          padding: '9px 12px',
          marginBottom: '8px',
          background: error ? '#fee2e2' : '#dcfce7',
          color: error ? '#991b1b' : '#166534',
          borderRadius: '8px',
          fontWeight: 'bold',
          textAlign: 'center',
          fontSize: '13px',
        }}
      >
        {error || mapStatus}
      </div>

      <div
        ref={mapElement}
        style={{
          width: '100%',
          height: '430px',
          borderRadius: '12px',
          border: '2px solid #15803d',
          background: '#e5e7eb',
          position: 'relative',
          zIndex: 0,
        }}
      />

      <style>
        {`
          .commune-name-tooltip {
            background: rgba(255, 255, 255, 0.97) !important;
            color: #064e20 !important;
            border: 2px solid #15803d !important;
            border-radius: 6px !important;
            padding: 5px 8px !important;
            font-family: Arial, sans-serif !important;
            font-size: 13px !important;
            font-weight: 900 !important;
            white-space: nowrap !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45) !important;
            text-align: center !important;
          }

          .commune-name-tooltip:before {
            display: none !important;
          }

          .leaflet-tooltip-pane {
            z-index: 700 !important;
          }

          .map-select-message {
            padding: 10px;
            margin-bottom: 8px;
            background: #e8f5e9;
            color: #216b37;
            border-radius: 8px;
            text-align: center;
          }
        `}
      </style>

      <div
        style={{
          display: 'flex',
          gap: '18px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '12px',
          fontSize: '13px',
        }}
      >
        <span style={{ color: '#15803d' }}>▰ حدود البلديات</span>
        <span style={{ color: '#7b1e1e' }}>● خطر حرج</span>
        <span style={{ color: '#dc2626' }}>● خطر مرتفع</span>
        <span style={{ color: '#d97706' }}>● خطر متوسط</span>
        <span style={{ color: '#16a34a' }}>● خطر منخفض</span>
      </div>
    </div>
  )
}
