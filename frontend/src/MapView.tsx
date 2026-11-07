import { useEffect, useRef, useState } from 'react'

type Site = {
  id: number
  name: string
  commune: string
  risk: string
  latitude: string
  longitude: string
}

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap
  on: (
    event: string,
    callback: (e: { latlng: { lat: number; lng: number } }) => void
  ) => void
  remove: () => void
}

type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup
  clearLayers: () => void
}

type LeafletMarker = {
  bindPopup: (content: string) => LeafletMarker
  addTo: (group: LeafletLayerGroup) => LeafletMarker
}

type Leaflet = {
  map: (element: HTMLElement, options?: object) => LeafletMap
  tileLayer: (
    url: string,
    options: object
  ) => {
    addTo: (map: LeafletMap) => void
  }
  layerGroup: () => LeafletLayerGroup
  circleMarker: (
    position: [number, number],
    options: object
  ) => LeafletMarker
}

function getLeaflet(): Leaflet | undefined {
  return (window as Window & { L?: Leaflet }).L
}

function loadLeaflet(): Promise<Leaflet> {
  return new Promise((resolve, reject) => {
    const ready = getLeaflet()

    if (ready) {
      resolve(ready)
      return
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    let script = document.getElementById(
      'leaflet-js'
    ) as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      document.body.appendChild(script)
    }

    script.addEventListener(
      'load',
      () => {
        const leaflet = getLeaflet()
        if (leaflet) resolve(leaflet)
        else reject(new Error('Leaflet لم يتم تحميله'))
      },
      { once: true }
    )

    script.addEventListener(
      'error',
      () => reject(new Error('تعذر تحميل مكتبة الخريطة')),
      { once: true }
    )
  })
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }

    return entities[char]
  })
}

type MapViewProps = {
  sites: Site[]
  selectingLocation: boolean
  onLocationSelect: (latitude: string, longitude: string) => void
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

  useEffect(() => {
    selectingRef.current = selectingLocation
    callbackRef.current = onLocationSelect
  }, [selectingLocation, onLocationSelect])

  useEffect(() => {
    let cancelled = false

    loadLeaflet()
      .then(L => {
        if (cancelled || !mapElement.current) return

        const map = L.map(mapElement.current).setView(
          [35.737, 0.555],
          9
        )

        mapRef.current = map

        // صور الأقمار الصناعية من Esri
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: 'Tiles © Esri',
            maxZoom: 19,
          }
        ).addTo(map)

        // مفتاح CARTO المحفوظ في إعدادات Vercel
        const cartoKey = import.meta.env.VITE_CARTO_API_KEY

        // طبقة أسماء الأماكن والطرق فوق صور الأقمار الصناعية
        if (cartoKey) {
          L.tileLayer(
            `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png?key=${cartoKey}`,
            {
              attribution:
                '&copy; OpenStreetMap contributors, &copy; CARTO, Tiles &copy; Esri',
              subdomains: 'abcd',
              maxZoom: 20,
            }
          ).addTo(map)
        } else {
          // طبقة بديلة عند غياب مفتاح CARTO
          L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
            {
              attribution: 'Labels © Esri',
              maxZoom: 19,
            }
          ).addTo(map)
        }

        markersRef.current = L.layerGroup().addTo(map)

        map.on('click', event => {
          if (selectingRef.current) {
            callbackRef.current(
              event.latlng.lat.toFixed(6),
              event.latlng.lng.toFixed(6)
            )
          }
        })

        setReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          setError('تعذر تحميل الخريطة. تحققي من اتصال الإنترنت.')
        }
      })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !markersRef.current || !getLeaflet()) return

    const L = getLeaflet()!
    const layer = markersRef.current

    layer.clearLayers()

    sites.forEach(site => {
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
        site.risk === 'مرتفع'
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
        fillOpacity: 0.85,
        weight: 2,
      })
        .bindPopup(popup)
        .addTo(layer)
    })
  }, [sites, ready])

  return (
    <div style={{ width: '100%', direction: 'rtl' }}>
      {selectingLocation && (
        <div
          style={{
            padding: '10px',
            marginBottom: '8px',
            background: '#e8f5e9',
            color: '#216b37',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          انقري على الخريطة لتحديد موقع المفرغة
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '12px',
            color: '#b91c1c',
            background: '#fee2e2',
            borderRadius: '8px',
            marginBottom: '8px',
          }}
        >
          {error}
        </div>
      )}

      <div
        ref={mapElement}
        style={{
          width: '100%',
          height: '430px',
          borderRadius: '12px',
          border: '1px solid #ddd',
          background: '#e5e7eb',
          zIndex: 1,
        }}
      />

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
        <span style={{ color: '#dc2626' }}>● خطر مرتفع</span>
        <span style={{ color: '#d97706' }}>● خطر متوسط</span>
        <span style={{ color: '#16a34a' }}>● خطر منخفض</span>
      </div>
    </div>
  )
}