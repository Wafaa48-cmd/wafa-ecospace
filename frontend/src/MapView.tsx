
import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import parseGeoraster from 'georaster'
import GeoRasterLayer from 'georaster-layer-for-leaflet'

type Site = {
  id: number
  name: string
  commune: string
  risk: string
  latitude: string
  longitude: string
}

type GeoFeature = {
  properties?: {
    shapeName?: string
  }
}

type GeoJSONData = {
  type: string
  features: GeoFeature[]
}

type RasterMode = 'none' | 'truecolor' | 'ndvi'

type RasterLayerInstance = L.Layer & {
  addTo: (map: L.Map) => RasterLayerInstance
}

type MapViewProps = {
  sites: Site[]
  selectingLocation: boolean
  onLocationSelect: (latitude: string, longitude: string) => void
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

function getNdviColor(value: number): string {
  if (!Number.isFinite(value) || value < -1 || value > 1) {
    return 'rgba(0,0,0,0)'
  }

  const stops = [
    { value: -1, color: [120, 45, 35] },
    { value: -0.2, color: [190, 90, 45] },
    { value: 0, color: [230, 210, 100] },
    { value: 0.2, color: [190, 210, 90] },
    { value: 0.4, color: [90, 170, 70] },
    { value: 0.6, color: [35, 125, 45] },
    { value: 1, color: [0, 75, 25] },
  ]

  for (let i = 0; i < stops.length - 1; i++) {
    const first = stops[i]
    const second = stops[i + 1]

    if (value >= first.value && value <= second.value) {
      const ratio =
        (value - first.value) / (second.value - first.value)

      const r = Math.round(
        first.color[0] + ratio * (second.color[0] - first.color[0])
      )
      const g = Math.round(
        first.color[1] + ratio * (second.color[1] - first.color[1])
      )
      const b = Math.round(
        first.color[2] + ratio * (second.color[2] - first.color[2])
      )

      return `rgb(${r},${g},${b})`
    }
  }

  return 'rgba(0,0,0,0)'
}

export default function MapView({
  sites,
  selectingLocation,
  onLocationSelect,
}: MapViewProps) {
  const mapElement = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.FeatureGroup | null>(null)
  const communeLayerRef = useRef<L.GeoJSON | null>(null)
  const rasterLayerRef = useRef<RasterLayerInstance | null>(null)

  const selectingRef = useRef(selectingLocation)
  const callbackRef = useRef(onLocationSelect)

  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [mapStatus, setMapStatus] = useState('جارٍ تحميل الخريطة...')
  const [rasterMode, setRasterMode] = useState<RasterMode>('none')
  const [rasterLoading, setRasterLoading] = useState(false)

  useEffect(() => {
    selectingRef.current = selectingLocation
    callbackRef.current = onLocationSelect
  }, [selectingLocation, onLocationSelect])

  // إنشاء الخريطة وحدود البلديات
  useEffect(() => {
    if (!mapElement.current) return

    let cancelled = false

    async function initializeMap() {
      let map: L.Map | null = null

      try {
        setMapStatus('جارٍ تحميل الخريطة...')

        map = L.map(mapElement.current as HTMLElement).setView(
          [35.737, 0.555],
          9
        )

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

        markersRef.current = L.featureGroup().addTo(map)

        map.on('click', (event: L.LeafletMouseEvent) => {
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
          throw new Error(
            `تعذر تحميل ملف البلديات: ${response.status}`
          )
        }

        const geoData = (await response.json()) as GeoJSONData

        if (
          geoData.type !== 'FeatureCollection' ||
          !Array.isArray(geoData.features) ||
          geoData.features.length !== 36
        ) {
          throw new Error(
            'ملف GeoJSON لا يحتوي على البلديات الـ36 المطلوبة.'
          )
        }

        if (cancelled) {
          map.remove()
          return
        }

        const communeLayer = L.geoJSON(
          geoData as unknown as GeoJSON.GeoJsonObject,
          {
            style: {
              color: '#00ff35',
              weight: 3,
              opacity: 1,
              fillColor: '#22c55e',
              fillOpacity: 0.08,
            },

            onEachFeature: (feature, layer) => {
              const properties = feature.properties as
                | { shapeName?: string }
                | undefined

              const englishName = properties?.shapeName?.trim() || ''
              const arabicName =
                communeNames[englishName] || englishName

              if (!arabicName) return

              layer.bindTooltip(escapeHtml(arabicName), {
                permanent: true,
                direction: 'center',
                className: 'commune-name-tooltip',
                opacity: 1,
                interactive: false,
              })
            },
          }
        )

        communeLayer.addTo(map)
        communeLayerRef.current = communeLayer

        map.fitBounds(communeLayer.getBounds(), {
          padding: [25, 25],
          maxZoom: 10,
        })

        map.invalidateSize()

        if (!cancelled) {
          setReady(true)
          setError('')
          setMapStatus(
            `تم تحميل حدود البلديات بنجاح: ${geoData.features.length} بلدية`
          )
        }
      } catch (err) {
        console.error('Map initialization error:', err)

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'حدث خطأ أثناء تحميل الخريطة'
          )
          setMapStatus('تعذر تحميل حدود البلديات')
        }
      }
    }

    initializeMap()

    return () => {
      cancelled = true
      rasterLayerRef.current = null
      communeLayerRef.current = null
      markersRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  // تحميل طبقة True Color أو NDVI عند اختيارها
  useEffect(() => {
    const currentMap = mapRef.current

    if (!ready || !currentMap) return

    let cancelled = false

    async function loadRaster() {
      const activeMap = mapRef.current

      if (!activeMap) return

      if (rasterLayerRef.current) {
        activeMap.removeLayer(rasterLayerRef.current)
        rasterLayerRef.current = null
      }

      if (rasterMode === 'none') {
        setRasterLoading(false)
        return
      }

      setRasterLoading(true)
      setError('')

      try {
        const fileName =
          rasterMode === 'truecolor'
            ? 'relizane-true-color.tif'
            : 'relizane-ndvi-original-values.tif'

        setMapStatus(
          rasterMode === 'truecolor'
            ? 'جارٍ تحميل صورة الأقمار الصناعية...'
            : 'جارٍ تحميل وتحليل طبقة NDVI...'
        )

        const response = await fetch(`/data/${fileName}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(
            `تعذر العثور على ملف ${fileName}. تأكدي من وجوده داخل public/data`
          )
        }

        const arrayBuffer = await response.arrayBuffer()
        const georaster = await parseGeoraster(arrayBuffer)

        if (cancelled || !mapRef.current) return

        const layer = new GeoRasterLayer({
          georaster,
          opacity: rasterMode === 'truecolor' ? 0.95 : 0.78,
          resolution: 128,

          pixelValuesToColorFn: (values: number[]) => {
            if (!values || values.length === 0) {
              return 'rgba(0,0,0,0)'
            }

            if (rasterMode === 'truecolor') {
              const red = values[0]
              const green = values[1]
              const blue = values[2]

              if (
                !Number.isFinite(red) ||
                !Number.isFinite(green) ||
                !Number.isFinite(blue)
              ) {
                return 'rgba(0,0,0,0)'
              }

              return `rgb(${Math.round(red)},${Math.round(green)},${Math.round(blue)})`
            }

            return getNdviColor(values[0])
          },
        }) as unknown as RasterLayerInstance

        const targetMap = mapRef.current

        if (cancelled || !targetMap) return

        layer.addTo(targetMap)
        rasterLayerRef.current = layer

        communeLayerRef.current?.bringToFront()
        markersRef.current?.bringToFront()

        setMapStatus(
          rasterMode === 'truecolor'
            ? 'تم تحميل صورة True Color بنجاح'
            : 'تم تحميل طبقة NDVI بنجاح'
        )
      } catch (err) {
        console.error('Raster loading error:', err)

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'تعذر تحميل طبقة الاستشعار عن بعد'
          )
          setMapStatus('تعذر تحميل الطبقة الفضائية')
        }
      } finally {
        if (!cancelled) {
          setRasterLoading(false)
        }
      }
    }

    loadRaster()

    return () => {
      cancelled = true
    }
  }, [rasterMode, ready])

  // إظهار مواقع المفرغات على الخريطة
  useEffect(() => {
    if (!ready || !markersRef.current) return

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

    layer.bringToFront()
  }, [sites, ready])

  return (
    <div style={{ width: '100%', direction: 'rtl' }}>
      {selectingLocation && (
        <div className="map-select-message">
          انقري على الخريطة لتحديد موقع المفرغة
        </div>
      )}

      <div className="raster-controls">
        <div className="raster-controls-title">
          طبقات الاستشعار عن بعد
        </div>

        <div className="raster-buttons">
          <button
            type="button"
            className={rasterMode === 'none' ? 'active' : ''}
            onClick={() => setRasterMode('none')}
          >
            الخريطة الأصلية
          </button>

          <button
            type="button"
            className={rasterMode === 'truecolor' ? 'active' : ''}
            onClick={() => setRasterMode('truecolor')}
          >
            True Color
          </button>

          <button
            type="button"
            className={rasterMode === 'ndvi' ? 'active' : ''}
            onClick={() => setRasterMode('ndvi')}
          >
            NDVI
          </button>
        </div>

        {rasterLoading && (
          <div className="raster-loading">
            جارٍ تحميل الطبقة الفضائية، يرجى الانتظار...
          </div>
        )}

        {rasterMode === 'truecolor' && (
          <div className="raster-description">
            صورة الأقمار الصناعية بالألوان الطبيعية (RGB)
          </div>
        )}

        {rasterMode === 'ndvi' && (
          <div className="ndvi-legend">
            <strong>مؤشر الغطاء النباتي NDVI</strong>
            <div className="ndvi-gradient" />
            <div className="ndvi-values">
              <span>-1</span>
              <span>-0.2</span>
              <span>0</span>
              <span>0.4</span>
              <span>1</span>
            </div>
            <div className="ndvi-description">
              ألوان بنية وصفراء: غطاء نباتي ضعيف أو غائب.
              <br />
              ألوان خضراء: غطاء نباتي أكثر كثافة.
            </div>
          </div>
        )}
      </div>

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

          .raster-controls {
            padding: 13px;
            margin-bottom: 10px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 10px;
          }

          .raster-controls-title {
            color: #14532d;
            font-weight: 900;
            margin-bottom: 10px;
            text-align: center;
          }

          .raster-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
          }

          .raster-buttons button {
            border: 1px solid #15803d;
            background: white;
            color: #166534;
            border-radius: 7px;
            padding: 9px 15px;
            cursor: pointer;
            font-weight: 700;
            font-size: 13px;
          }

          .raster-buttons button.active {
            background: #15803d;
            color: white;
          }

          .raster-loading {
            text-align: center;
            margin-top: 10px;
            color: #166534;
            font-size: 13px;
            font-weight: bold;
          }

          .raster-description {
            text-align: center;
            margin-top: 10px;
            color: #166534;
            font-size: 12px;
          }

          .ndvi-legend {
            margin: 12px auto 0;
            max-width: 420px;
            color: #14532d;
            font-size: 12px;
          }

          .ndvi-legend strong {
            display: block;
            text-align: center;
            margin-bottom: 8px;
          }

          .ndvi-gradient {
            height: 15px;
            border-radius: 5px;
            background: linear-gradient(
              to left,
              #004b19,
              #237d2d,
              #5aaa46,
              #bed25a,
              #e6d264,
              #be5a2d,
              #782d23
            );
          }

          .ndvi-values {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            direction: ltr;
          }

          .ndvi-description {
            margin-top: 8px;
            line-height: 1.8;
            text-align: right;
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

      {rasterMode === 'ndvi' && (
        <div
          style={{
            fontSize: '12px',
            color: '#64748b',
            textAlign: 'center',
            padding: '4px 10px 12px',
          }}
        >
          ملاحظة: مؤشر NDVI يوضح حالة الغطاء النباتي، ولا يثبت وحده وجود مفرغة عشوائية.
        </div>
      )}
    </div>
  )
}
