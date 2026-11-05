
import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import logo from './assets/logo.png.jpg'
import MapView from './MapView'
import { calculateRisk } from './riskEngine'
import { supabase } from './supabase'

export type Site = {
  id: number
  name: string
  commune: string
  wasteType: string
  risk: string
  riskScore?: number
  riskPercentage?: number
  wasteHazard?: number
  populationProximity?: number
  waterProximity?: number
  agricultureProximity?: number
  wasteQuantity?: number
  burning?: number
  leakage?: number
  description: string
  latitude: string
  longitude: string
}

const RISK_COLORS: Record<string, string> = {
  منخفض: '#287a4b',
  متوسط: '#d68910',
  مرتفع: '#c0392b',
  حرج: '#7b1e1e',
}

const wasteTypeOptions = [
  'نفايات منزلية',
  'نفايات بلاستيكية',
  'نفايات ورقية وكرتونية',
  'نفايات زجاجية',
  'نفايات معدنية',
  'نفايات عضوية',
  'نفايات البناء والهدم',
  'نفايات صناعية',
  'نفايات طبية وصيدلانية',
  'نفايات إلكترونية وكهربائية',
  'نفايات زراعية',
  'نفايات خطرة ومواد كيميائية',
  'نفايات مختلطة',
  'نفايات المنسوجات والملابس',
  'نفايات الإطارات والمطاط',
  'نفايات الزيوت المستعملة',
  'نفايات الحدائق والمساحات الخضراء',
  'نفايات أخرى',
]

const initialSites: Site[] = [
  {
    id: 1,
    name: 'مفرغة تجريبية 1',
    commune: 'غليزان',
    wasteType: 'نفايات منزلية',
    risk: 'مرتفع',
    description: 'موقع تجريبي للمنصة',
    latitude: '35.7373',
    longitude: '0.55599',
  },
  {
    id: 2,
    name: 'مفرغة تجريبية 2',
    commune: 'وادي رهيو',
    wasteType: 'نفايات مختلطة',
    risk: 'متوسط',
    description: 'موقع تجريبي للمنصة',
    latitude: '35.8',
    longitude: '0.55',
  },
]

const emptyForm = {
  name: '',
  commune: '',
  wasteType: '',
  description: '',
  latitude: '',
  longitude: '',
  wasteHazard: '0',
  populationProximity: '0',
  waterProximity: '0',
  agricultureProximity: '0',
  wasteQuantity: '0',
  burning: '0',
  leakage: '0',
}

const factorOptions = [
  { key: 'wasteHazard', label: 'خطورة نوع النفايات' },
  { key: 'populationProximity', label: 'القرب من السكان' },
  { key: 'waterProximity', label: 'القرب من مصادر المياه' },
  { key: 'agricultureProximity', label: 'القرب من الأراضي الزراعية' },
  { key: 'wasteQuantity', label: 'كمية النفايات' },
  { key: 'burning', label: 'وجود الحرق أو الدخان' },
  { key: 'leakage', label: 'وجود تسربات أو عصارة' },
] as const

const factorDescriptions: Record<string, string> = {
  '0': 'منخفض جدًا / غير موجود',
  '1': 'منخفض',
  '2': 'متوسط',
  '3': 'مرتفع',
  '4': 'مرتفع جدًا',
}

function getPriority(
  risk: string,
  percentage?: number,
): {
  label: string
  color: string
  description: string
} {
  if (risk === 'حرج' || (percentage !== undefined && percentage >= 75)) {
    return {
      label: 'عاجلة',
      color: '#7b1e1e',
      description:
        'يُنصح بالتدخل في أقرب وقت ممكن ومعالجة مصادر الخطر الرئيسية.',
    }
  }

  if (risk === 'مرتفع' || (percentage !== undefined && percentage >= 50)) {
    return {
      label: 'عالية',
      color: '#c0392b',
      description:
        'يحتاج الموقع إلى متابعة وتدخل بيئي ذي أولوية.',
    }
  }

  if (risk === 'متوسط' || (percentage !== undefined && percentage >= 25)) {
    return {
      label: 'عادية',
      color: '#d68910',
      description:
        'يحتاج الموقع إلى المراقبة والمتابعة الدورية.',
    }
  }

  return {
    label: 'منخفضة',
    color: '#287a4b',
    description:
      'لا توجد أولوية عالية حاليًا، مع استمرار المراقبة.',
  }
}

function getMainFactors(site: Site) {
  const factors = [
    { label: 'خطورة نوع النفايات', value: site.wasteHazard ?? 0 },
    { label: 'القرب من السكان', value: site.populationProximity ?? 0 },
    { label: 'القرب من مصادر المياه', value: site.waterProximity ?? 0 },
    {
      label: 'القرب من الأراضي الزراعية',
      value: site.agricultureProximity ?? 0,
    },
    { label: 'كمية النفايات', value: site.wasteQuantity ?? 0 },
    { label: 'وجود الحرق أو الدخان', value: site.burning ?? 0 },
    { label: 'وجود تسربات أو عصارة', value: site.leakage ?? 0 },
  ]

  return factors
    .filter(factor => factor.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
}

function getRecommendations(site: Site): string[] {
  const recommendations: string[] = []

  if ((site.burning ?? 0) >= 2) {
    recommendations.push(
      'إيقاف الحرق العشوائي ومراقبة الموقع للحد من الدخان وتلوث الهواء.',
    )
  }

  if ((site.leakage ?? 0) >= 2) {
    recommendations.push(
      'معالجة التسربات أو العصارة ومنع وصولها إلى التربة ومصادر المياه.',
    )
  }

  if ((site.populationProximity ?? 0) >= 2) {
    recommendations.push(
      'إعطاء الموقع أولوية في التنظيف والمراقبة بسبب قربه من السكان.',
    )
  }

  if ((site.waterProximity ?? 0) >= 2) {
    recommendations.push(
      'فحص محيط الموقع واتخاذ إجراءات تمنع انتقال النفايات أو العصارة إلى المياه.',
    )
  }

  if ((site.agricultureProximity ?? 0) >= 2) {
    recommendations.push(
      'حماية الأراضي الزراعية المجاورة ومنع انتشار النفايات إليها.',
    )
  }

  if ((site.wasteQuantity ?? 0) >= 3) {
    recommendations.push(
      'برمجة عملية لرفع النفايات ونقلها إلى مرفق معالجة أو تخلص مرخّص.',
    )
  }

  if ((site.wasteHazard ?? 0) >= 3) {
    recommendations.push(
      'تحديد نوع النفايات الخطرة وعزلها والتعامل معها بواسطة الجهات المختصة.',
    )
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'الاستمرار في المراقبة الدورية وتحديث تقييم الموقع عند تغير الظروف الميدانية.',
    )
  }

  return recommendations.slice(0, 4)
}

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? 'غير محدد')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function printSiteReport(site: Site) {
  const priority = getPriority(site.risk, site.riskPercentage)
  const mainFactors = getMainFactors(site)
  const recommendations = getRecommendations(site)

  const riskScore =
    site.riskScore !== undefined ? `${site.riskScore} / 28` : 'غير مسجل'

  const riskPercentage =
    site.riskPercentage !== undefined
      ? `${site.riskPercentage}%`
      : 'غير مسجل'

  const factors = [
    ['خطورة نوع النفايات', site.wasteHazard],
    ['القرب من السكان', site.populationProximity],
    ['القرب من مصادر المياه', site.waterProximity],
    ['القرب من الأراضي الزراعية', site.agricultureProximity],
    ['كمية النفايات', site.wasteQuantity],
    ['وجود الحرق أو الدخان', site.burning],
    ['وجود تسربات أو عصارة', site.leakage],
  ]

  const reportWindow = window.open('', '_blank', 'width=900,height=700')

  if (!reportWindow) {
    window.alert(
      'تعذر فتح التقرير. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مجددًا.',
    )
    return
  }

  reportWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>التقرير البيئي - ${escapeHtml(site.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Tahoma, sans-serif; color: #263b2e; margin: 0; padding: 32px; line-height: 1.7; }
    header { border-bottom: 3px solid #287a4b; padding-bottom: 16px; margin-bottom: 22px; }
    h1 { margin: 0 0 6px; color: #246b43; font-size: 26px; }
    h2 { color: #246b43; font-size: 18px; margin: 24px 0 8px; }
    .sub { color: #617267; margin: 0; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
    .metric { border: 1px solid #d5e4d9; background: #f4faf5; border-radius: 8px; padding: 14px; }
    .metric strong { display: block; font-size: 20px; margin-top: 4px; }
    .priority { color: ${priority.color}; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    th, td { border: 1px solid #d9e2dc; padding: 8px 10px; text-align: right; }
    th { background: #edf5ef; }
    li { margin-bottom: 7px; }
    .note { background: #f7f8f7; border-right: 4px solid #8aa895; padding: 10px 14px; }
    footer { border-top: 1px solid #d9e2dc; margin-top: 30px; padding-top: 12px; font-size: 12px; color: #66756b; }
    .actions { margin-bottom: 20px; }
    .actions button { border: 0; border-radius: 6px; background: #287a4b; color: white; padding: 10px 16px; font-size: 15px; cursor: pointer; }
    @media print { body { padding: 0; } .actions { display: none; } .metric, table, .note { break-inside: avoid; } }
    @media (max-width: 600px) { body { padding: 16px; } .summary { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">طباعة التقرير / حفظ PDF</button></div>
  <header>
    <h1>WAFA ECOSPACE</h1>
    <p class="sub">تقرير تقييم المخاطر البيئية للمفرغات العشوائية — ولاية غليزان</p>
  </header>
  <h2>1. معلومات الموقع</h2>
  <table><tbody>
    <tr><th>اسم الموقع</th><td>${escapeHtml(site.name)}</td><th>البلدية</th><td>${escapeHtml(site.commune)}</td></tr>
    <tr><th>نوع النفايات</th><td>${escapeHtml(site.wasteType)}</td><th>رقم الموقع</th><td>${escapeHtml(site.id)}</td></tr>
    <tr><th>خط العرض</th><td>${escapeHtml(site.latitude)}</td><th>خط الطول</th><td>${escapeHtml(site.longitude)}</td></tr>
  </tbody></table>
  <h2>2. ملخص تقييم الخطر</h2>
  <div class="summary">
    <div class="metric">درجة الخطر<strong>${riskScore}</strong></div>
    <div class="metric">نسبة الخطر<strong>${riskPercentage}</strong></div>
    <div class="metric">مستوى الخطر<strong style="color:${RISK_COLORS[site.risk] || '#287a4b'}">${escapeHtml(site.risk)}</strong></div>
  </div>
  <p>أولوية التدخل: <span class="priority">${escapeHtml(priority.label)}</span></p>
  <p>${escapeHtml(priority.description)}</p>
  <h2>3. عوامل تقييم الخطر (من 0 إلى 4)</h2>
  <table><thead><tr><th>العامل</th><th>القيمة</th></tr></thead><tbody>
    ${factors.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${value === undefined ? 'غير مسجل' : `${escapeHtml(value)} / 4`}</td></tr>`).join('')}
  </tbody></table>
  <h2>4. أهم عوامل الخطر المسجلة</h2>
  ${mainFactors.length ? `<ol>${mainFactors.map(factor => `<li>${escapeHtml(factor.label)}: ${escapeHtml(factor.value)} / 4</li>`).join('')}</ol>` : '<p>لم تُسجل قيم موجبة لعوامل الخطر.</p>'}
  <h2>5. توصيات التدخل</h2>
  <ol>${recommendations.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
  <h2>6. وصف الموقع</h2>
  <p class="note">${escapeHtml(site.description || 'لا يوجد وصف مسجل.')}</p>
  <footer>تم إنشاء هذا التقرير آليًا بواسطة WAFA ECOSPACE. التوصيات إرشادية مبنية على القيم المدخلة، وتحتاج إلى التحقق الميداني وتقدير الجهات المختصة قبل اتخاذ أي إجراء.</footer>
  <script>window.onload = () => { setTimeout(() => window.print(), 350) }</script>
</body>
</html>`)

  reportWindow.document.close()
}

type DumpSiteRow = {
  id: number
  name: string
  commune: string
  waste_type: string
  risk: string
  risk_score: number | null
  risk_percentage: number | null
  waste_hazard: number | null
  population_proximity: number | null
  water_proximity: number | null
  agriculture_proximity: number | null
  waste_quantity: number | null
  burning: number | null
  leakage: number | null
  description: string | null
  latitude: number | string | null
  longitude: number | string | null
}

function rowToSite(row: DumpSiteRow): Site {
  return {
    id: Number(row.id),
    name: row.name ?? '',
    commune: row.commune ?? '',
    wasteType: row.waste_type ?? '',
    risk: row.risk ?? 'متوسط',
    riskScore: row.risk_score ?? undefined,
    riskPercentage: row.risk_percentage ?? undefined,
    wasteHazard: row.waste_hazard ?? undefined,
    populationProximity: row.population_proximity ?? undefined,
    waterProximity: row.water_proximity ?? undefined,
    agricultureProximity: row.agriculture_proximity ?? undefined,
    wasteQuantity: row.waste_quantity ?? undefined,
    burning: row.burning ?? undefined,
    leakage: row.leakage ?? undefined,
    description: row.description ?? '',
    latitude: row.latitude == null ? '' : String(row.latitude),
    longitude: row.longitude == null ? '' : String(row.longitude),
  }
}

function App() {
  const [sites, setSites] = useState<Site[]>(() => {
    try {
      const saved = localStorage.getItem('wafa-sites')

      if (saved) {
        const parsed: unknown = JSON.parse(saved)

        if (Array.isArray(parsed)) {
          return parsed as Site[]
        }
      }
    } catch {
      console.error('تعذر تحميل المواقع المحفوظة')
    }

    return initialSites
  })

  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCommune, setFilterCommune] = useState('')
  const [filterRisk, setFilterRisk] = useState('')
  const [filterWaste, setFilterWaste] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem('wafa-sites', JSON.stringify(sites))
    } catch {
      console.error('تعذر حفظ المواقع')
    }
  }, [sites])

  // تحميل المواقع من Supabase مع الإبقاء على البيانات المحلية السابقة.
  useEffect(() => {
    let active = true

    const loadCloudSites = async () => {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError) {
        console.error(
          'تعذر التحقق من جلسة المستخدم:',
          userError.message,
        )
        return
      }

      const userId = userData.user?.id

      if (!userId) {
        return
      }

      if (active) {
        setCurrentUserId(userId)
      }

      const { data, error } = await supabase
        .from('dump_sites')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(
          'تعذر تحميل المواقع من Supabase:',
          error.message,
        )

        if (active) {
          window.alert(
            'تعذر تحميل المواقع من قاعدة البيانات. تحققي من صلاحيات RLS في Supabase.',
          )
        }

        return
      }

      if (active && data) {
        const cloudSites = (data as DumpSiteRow[]).map(rowToSite)

        setSites(previous => {
          const merged = new Map<number, Site>()

          previous.forEach(site => {
            merged.set(Number(site.id), site)
          })

          cloudSites.forEach(site => {
            merged.set(Number(site.id), site)
          })

          return Array.from(merged.values())
        })
      }
    }

    void loadCloudSites()

    return () => {
      active = false
    }
  }, [])

  const addSite = async () => {
    if (
      !form.name.trim() ||
      !form.commune.trim() ||
      !form.wasteType
    ) {
      window.alert('يرجى ملء اسم الموقع والبلدية ونوع النفايات')
      return
    }

    if (!form.latitude.trim() || !form.longitude.trim()) {
      window.alert(
        'يرجى اختيار الموقع من الخريطة أو إدخال الإحداثيات',
      )
      return
    }

    const lat = Number(form.latitude)
    const lng = Number(form.longitude)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      window.alert('يرجى التحقق من خط العرض وخط الطول')
      return
    }

    const riskResult = calculateRisk({
      wasteHazard: Number(form.wasteHazard),
      populationProximity: Number(form.populationProximity),
      waterProximity: Number(form.waterProximity),
      agricultureProximity: Number(form.agricultureProximity),
      wasteQuantity: Number(form.wasteQuantity),
      burning: Number(form.burning),
      leakage: Number(form.leakage),
    })

    if (!currentUserId) {
      window.alert(
        'يرجى تسجيل الدخول أولًا قبل حفظ الموقع في قاعدة البيانات.',
      )
      return
    }

    const siteValues = {
      name: form.name.trim(),
      commune: form.commune.trim(),
      waste_type: form.wasteType,
      risk: riskResult.level,
      risk_score: riskResult.score,
      risk_percentage: riskResult.percentage,
      waste_hazard: Number(form.wasteHazard),
      population_proximity: Number(form.populationProximity),
      water_proximity: Number(form.waterProximity),
      agriculture_proximity: Number(form.agricultureProximity),
      waste_quantity: Number(form.wasteQuantity),
      burning: Number(form.burning),
      leakage: Number(form.leakage),
      description: form.description.trim(),
      latitude: lat,
      longitude: lng,
      user_id: currentUserId,
    }

    const { data, error } = await supabase
      .from('dump_sites')
      .insert(siteValues)
      .select('*')
      .single()

    if (error || !data) {
      console.error(
        'تعذر حفظ الموقع في Supabase:',
        error?.message,
      )

      window.alert(
        `لم يتم حفظ الموقع في قاعدة البيانات: ${error?.message ?? 'لم يتم إرجاع السجل'}`,
      )
      return
    }

    const newSite = rowToSite(data as DumpSiteRow)

    setSites(previous => [
      ...previous.filter(site => site.id !== newSite.id),
      newSite,
    ])

    setForm(emptyForm)
    setShowForm(false)

    window.alert(
      'تم حفظ الموقع بنجاح في قاعدة البيانات وظهوره على الخريطة.',
    )
  }

  const deleteSite = async (id: number) => {
    if (
      !window.confirm(
        'هل تريد حذف هذا الموقع من قاعدة البيانات؟',
      )
    ) {
      return
    }

    if (!currentUserId) {
      window.alert('يرجى تسجيل الدخول أولًا.')
      return
    }

    const { error } = await supabase
      .from('dump_sites')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUserId)

    if (error) {
      console.error(
        'تعذر حذف الموقع من Supabase:',
        error.message,
      )

      window.alert(`تعذر حذف الموقع: ${error.message}`)
      return
    }

    setSites(previous =>
      previous.filter(site => site.id !== id),
    )
  }

  const resetFilters = () => {
    setSearch('')
    setFilterCommune('')
    setFilterRisk('')
    setFilterWaste('')
  }

  const filteredSites = sites.filter(site => {
    const query = search.trim().toLowerCase()

    const matchesSearch =
      site.name.toLowerCase().includes(query) ||
      site.commune.toLowerCase().includes(query) ||
      site.wasteType.toLowerCase().includes(query)

    return (
      matchesSearch &&
      (!filterCommune || site.commune === filterCommune) &&
      (!filterRisk || site.risk === filterRisk) &&
      (!filterWaste || site.wasteType === filterWaste)
    )
  })

  const exportCSV = () => {
    const headers = [
      'رقم الموقع',
      'اسم الموقع',
      'البلدية',
      'نوع النفايات',
      'درجة الخطر',
      'نسبة الخطر',
      'مستوى الخطر',
      'أولوية التدخل',
      'خطورة النفايات',
      'القرب من السكان',
      'القرب من المياه',
      'القرب من الأراضي الزراعية',
      'كمية النفايات',
      'الحرق',
      'التسرب',
      'خط العرض',
      'خط الطول',
      'الوصف',
    ]

    const rows = filteredSites.map(site => {
      const priority = getPriority(
        site.risk,
        site.riskPercentage,
      )

      return [
        site.id,
        site.name,
        site.commune,
        site.wasteType,
        site.riskScore ?? '',
        site.riskPercentage !== undefined
          ? `${site.riskPercentage}%`
          : '',
        site.risk,
        priority.label,
        site.wasteHazard ?? '',
        site.populationProximity ?? '',
        site.waterProximity ?? '',
        site.agricultureProximity ?? '',
        site.wasteQuantity ?? '',
        site.burning ?? '',
        site.leakage ?? '',
        site.latitude,
        site.longitude,
        site.description,
      ]
    })

    const escapeCSV = (value: string | number) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(';'))
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'wafa-ecospace-sites.csv'

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  const highRisk = sites.filter(
    site => site.risk === 'مرتفع',
  ).length

  const mediumRisk = sites.filter(
    site => site.risk === 'متوسط',
  ).length

  const lowRisk = sites.filter(
    site => site.risk === 'منخفض',
  ).length

  const criticalRisk = sites.filter(
    site => site.risk === 'حرج',
  ).length

  const riskData = [
    {
      name: 'حرج',
      value: criticalRisk,
      color: RISK_COLORS['حرج'],
    },
    {
      name: 'مرتفع',
      value: highRisk,
      color: RISK_COLORS['مرتفع'],
    },
    {
      name: 'متوسط',
      value: mediumRisk,
      color: RISK_COLORS['متوسط'],
    },
    {
      name: 'منخفض',
      value: lowRisk,
      color: RISK_COLORS['منخفض'],
    },
  ]

  const communeCounts = Object.entries(
    sites.reduce<Record<string, number>>(
      (counts, site) => {
        const commune = site.commune.trim() || 'غير محددة'
        counts[commune] = (counts[commune] || 0) + 1
        return counts
      },
      {},
    ),
  )
    .map(([commune, total]) => ({ commune, total }))
    .sort((a, b) => b.total - a.total)

  const averageRiskPercentage = sites.length
    ? Math.round(
        sites.reduce(
          (total, site) =>
            total +
            (site.riskPercentage ??
              Math.round(((site.riskScore ?? 0) / 28) * 100)),
          0,
        ) / sites.length,
      )
    : 0

  const highPrioritySites = sites.filter(
    site => site.risk === 'حرج' || site.risk === 'مرتفع',
  ).length

  const communeRiskCounts = Object.entries(
    sites.reduce<Record<string, number>>(
      (counts, site) => {
        if (site.risk === 'حرج' || site.risk === 'مرتفع') {
          const commune = site.commune.trim() || 'غير محددة'
          counts[commune] = (counts[commune] || 0) + 1
        }

        return counts
      },
      {},
    ),
  )
    .map(([commune, total]) => ({ commune, total }))
    .sort((a, b) => b.total - a.total)

  const mostPriorityCommune = communeRiskCounts[0]

  const communes = [
    ...new Set(
      sites
        .map(site => site.commune)
        .filter(Boolean),
    ),
  ]

  const wasteTypes = [
    ...new Set([
      ...wasteTypeOptions,
      ...sites.map(site => site.wasteType).filter(Boolean),
    ]),
  ]

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f8f5',
        fontFamily: 'Arial, sans-serif',
        color: '#1f3d2b',
      }}
    >
      <header style={headerStyle}>
        <img
          src={logo}
          alt="شعار WAFA ECOSPACE"
          style={{
            width: 70,
            height: 70,
            objectFit: 'contain',
          }}
        />

        <div>
          <h1 style={{ margin: 0 }}>
            WAFA ECOSPACE
          </h1>

          <p
            style={{
              margin: '5px 0',
              color: '#66806f',
            }}
          >
            منصة مراقبة المفرغات العشوائية والمخاطر البيئية
          </p>
        </div>
      </header>

      <main style={mainStyle}>
        <h2>لوحة التحكم البيئية</h2>

        <p style={{ color: '#66756b' }}>
          متابعة المفرغات العشوائية والمخاطر البيئية في ولاية غليزان
        </p>

        <div style={statsGridStyle}>
          <StatCard
            title="إجمالي المواقع"
            value={sites.length}
            color="#1f3d2b"
          />

          <StatCard
            title="خطر حرج"
            value={criticalRisk}
            color={RISK_COLORS['حرج']}
          />

          <StatCard
            title="خطر مرتفع"
            value={highRisk}
            color={RISK_COLORS['مرتفع']}
          />

          <StatCard
            title="خطر متوسط"
            value={mediumRisk}
            color={RISK_COLORS['متوسط']}
          />

          <StatCard
            title="خطر منخفض"
            value={lowRisk}
            color={RISK_COLORS['منخفض']}
          />
        </div>

        <section style={cardStyle}>
          <h2>المؤشرات البيئية المتقدمة</h2>

          <p style={mutedStyle}>
            ملخص تلقائي لحالة المواقع المسجلة في ولاية غليزان، اعتمادًا على البيانات المدخلة في المنصة.
          </p>

          <div style={statsGridStyle}>
            <StatCard
              title="نسبة المواقع الحرجة والمرتفعة"
              value={`${
                sites.length
                  ? Math.round(
                      (highPrioritySites / sites.length) * 100,
                    )
                  : 0
              }%`}
              color="#a93226"
            />

            <StatCard
              title="متوسط نسبة الخطر"
              value={`${averageRiskPercentage}%`}
              color="#9a6b16"
            />

            <StatCard
              title="مواقع تحتاج أولوية"
              value={highPrioritySites}
              color="#7b1e1e"
            />

            <StatCard
              title="البلدية الأكثر احتياجًا"
              value={mostPriorityCommune?.commune ?? 'لا توجد بيانات'}
              color="#2366a8"
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <h3 style={{ marginBottom: 8 }}>
              البلديات حسب عدد المواقع عالية الأولوية
            </h3>

            {communeRiskCounts.length === 0 ? (
              <p style={mutedStyle}>
                لا توجد حاليًا مواقع مصنفة مرتفعة أو حرجة.
              </p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 320,
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#edf4ef',
                      textAlign: 'right',
                    }}
                  >
                    <th style={dashboardTableCellStyle}>الترتيب</th>
                    <th style={dashboardTableCellStyle}>البلدية</th>
                    <th style={dashboardTableCellStyle}>
                      مواقع مرتفعة/حرجة
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {communeRiskCounts.map((item, index) => (
                    <tr key={item.commune}>
                      <td style={dashboardTableCellStyle}>
                        {index + 1}
                      </td>

                      <td style={dashboardTableCellStyle}>
                        {item.commune}
                      </td>

                      <td
                        style={{
                          ...dashboardTableCellStyle,
                          fontWeight: 'bold',
                          color: '#a93226',
                        }}
                      >
                        {item.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p
            style={{
              ...mutedStyle,
              marginTop: 14,
              lineHeight: 1.7,
            }}
          >
            ملاحظة: هذه المؤشرات وصفية وتعتمد على المواقع المسجلة فقط؛ ولا تمثل مسحًا شاملًا لجميع بلديات الولاية ما لم تُستكمل البيانات الميدانية.
          </p>
        </section>

        <section style={cardStyle}>
          <h2>تحليل مستويات الخطر</h2>

          <p style={mutedStyle}>
            توزيع المواقع المسجلة حسب مستوى الخطر المحسوب.
          </p>

          {sites.length === 0 ? (
            <p>لا توجد بيانات كافية لعرض الرسم البياني.</p>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {riskData.map(item => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={value => [
                      `${value} موقع`,
                      'العدد',
                    ]}
                  />

                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2>توزيع المفرغات حسب البلدية</h2>

          <p style={mutedStyle}>
            عدد المواقع المسجلة في كل بلدية.
          </p>

          {communeCounts.length === 0 ? (
            <p>لا توجد بلديات مسجلة بعد.</p>
          ) : (
            <div
              style={{
                width: '100%',
                height: Math.max(300, communeCounts.length * 65),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={communeCounts}
                  layout="vertical"
                  margin={{
                    top: 10,
                    right: 25,
                    left: 15,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="commune"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip
                    formatter={value => [
                      `${value} موقع`,
                      'العدد',
                    ]}
                  />

                  <Bar
                    dataKey="total"
                    name="عدد المواقع"
                    fill="#287a4b"
                    radius={[0, 5, 5, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2>خريطة ولاية غليزان</h2>

          <p style={mutedStyle}>
            {showForm
              ? 'انقري على الخريطة لاختيار الموقع، وستظهر الإحداثيات في النموذج.'
              : 'افتحي نموذج التسجيل لاختيار إحداثيات مفرغة جديدة من الخريطة.'}
          </p>

          <MapView
            sites={sites}
            selectingLocation={showForm}
            onLocationSelect={(latitude, longitude) => {
              setForm(previous => ({
                ...previous,
                latitude,
                longitude,
              }))
            }}
          />
        </section>

        <button
          onClick={() => setShowForm(previous => !previous)}
          style={buttonStyle}
        >
          {showForm ? 'إغلاق النموذج' : '+ تسجيل مفرغة جديدة'}
        </button>

        {showForm && (
          <section style={cardStyle}>
            <h2>تسجيل مفرغة جديدة</h2>

            <input
              placeholder="اسم الموقع"
              value={form.name}
              onChange={e =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              style={inputStyle}
            />

            <input
              placeholder="البلدية"
              value={form.commune}
              onChange={e =>
                setForm({
                  ...form,
                  commune: e.target.value,
                })
              }
              style={inputStyle}
            />

            <select
              value={form.wasteType}
              onChange={e =>
                setForm({
                  ...form,
                  wasteType: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">اختر نوع النفايات</option>

              {wasteTypes.map(waste => (
                <option key={waste} value={waste}>
                  {waste}
                </option>
              ))}
            </select>

            <section
              style={{
                ...innerCardStyle,
                marginBottom: 20,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                تقييم عوامل الخطر
              </h3>

              <p style={mutedStyle}>
                لكل عامل اختر قيمة من 0 إلى 4 حسب الوضع الميداني. سيتم حساب مستوى الخطر تلقائيًا.
              </p>

              {factorOptions.map(factor => (
                <div key={factor.key}>
                  <label style={labelStyle}>
                    {factor.label}
                  </label>

                  <select
                    value={form[factor.key]}
                    onChange={e =>
                      setForm({
                        ...form,
                        [factor.key]: e.target.value,
                      })
                    }
                    style={inputStyle}
                  >
                    {[0, 1, 2, 3, 4].map(value => (
                      <option key={value} value={value}>
                        {value} — {factorDescriptions[String(value)]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <p style={mutedStyle}>
                الحد الأقصى للدرجة هو 28 نقطة.
              </p>
            </section>

            <label style={labelStyle}>
              خط العرض (Latitude)
            </label>

            <input
              type="number"
              step="any"
              placeholder="اختاري الموقع من الخريطة"
              value={form.latitude}
              onChange={e =>
                setForm({
                  ...form,
                  latitude: e.target.value,
                })
              }
              style={inputStyle}
            />

            <label style={labelStyle}>
              خط الطول (Longitude)
            </label>

            <input
              type="number"
              step="any"
              placeholder="اختاري الموقع من الخريطة"
              value={form.longitude}
              onChange={e =>
                setForm({
                  ...form,
                  longitude: e.target.value,
                })
              }
              style={inputStyle}
            />

            <textarea
              placeholder="وصف الموقع"
              value={form.description}
              onChange={e =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              style={{
                ...inputStyle,
                minHeight: 100,
              }}
            />

            <button
              onClick={addSite}
              style={buttonStyle}
            >
              حفظ الموقع وحساب الخطر
            </button>
          </section>
        )}

        <section
          style={{
            ...cardStyle,
            marginTop: 25,
          }}
        >
          <h2>
            المواقع المسجلة ({filteredSites.length})
          </h2>

          <input
            placeholder="ابحث باسم الموقع أو البلدية أو نوع النفايات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />

          <div style={filtersStyle}>
            <select
              value={filterCommune}
              onChange={e => setFilterCommune(e.target.value)}
              style={inputStyle}
            >
              <option value="">جميع البلديات</option>

              {communes.map(commune => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
            </select>

            <select
              value={filterWaste}
              onChange={e => setFilterWaste(e.target.value)}
              style={inputStyle}
            >
              <option value="">جميع أنواع النفايات</option>

              {wasteTypes.map(waste => (
                <option key={waste} value={waste}>
                  {waste}
                </option>
              ))}
            </select>

            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              style={inputStyle}
            >
              <option value="">جميع مستويات الخطر</option>
              <option value="حرج">خطر حرج</option>
              <option value="مرتفع">خطر مرتفع</option>
              <option value="متوسط">خطر متوسط</option>
              <option value="منخفض">خطر منخفض</option>
            </select>
          </div>

          <button
            onClick={resetFilters}
            style={buttonStyle}
          >
            مسح البحث والفلاتر
          </button>

          <button
            onClick={exportCSV}
            disabled={filteredSites.length === 0}
            style={{
              ...buttonStyle,
              backgroundColor: filteredSites.length
                ? '#2366a8'
                : '#999',
              cursor: filteredSites.length
                ? 'pointer'
                : 'not-allowed',
            }}
          >
            تصدير النتائج إلى Excel (CSV)
          </button>

          {filteredSites.length === 0 && (
            <p>لا توجد مواقع مطابقة للبحث.</p>
          )}

          {filteredSites.map(site => {
            const priority = getPriority(
              site.risk,
              site.riskPercentage,
            )

            const mainFactors = getMainFactors(site)
            const recommendations = getRecommendations(site)

            return (
              <div key={site.id} style={siteStyle}>
                <h3>{site.name}</h3>

                <p>
                  <strong>البلدية:</strong> {site.commune}
                </p>

                <p>
                  <strong>نوع النفايات:</strong> {site.wasteType}
                </p>

                <p>
                  <strong>درجة الخطر:</strong>{' '}
                  {site.riskScore !== undefined
                    ? `${site.riskScore} / 28`
                    : 'غير محسوبة للموقع القديم'}
                </p>

                {site.riskPercentage !== undefined && (
                  <div
                    style={{
                      margin: '15px 0',
                      padding: 15,
                      borderRadius: 10,
                      backgroundColor: '#f4f8f5',
                      border: '1px solid #dce8df',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <strong>نسبة الخطر</strong>

                      <strong
                        style={{
                          color:
                            RISK_COLORS[site.risk] || '#287a4b',
                          fontSize: 20,
                        }}
                      >
                        {site.riskPercentage}%
                      </strong>
                    </div>

                    <div
                      style={{
                        height: 20,
                        backgroundColor: '#dce8df',
                        borderRadius: 10,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${site.riskPercentage}%`,
                          height: '100%',
                          backgroundColor:
                            RISK_COLORS[site.risk] || '#287a4b',
                          borderRadius: 10,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div
                  style={{
                    margin: '15px 0',
                    padding: 16,
                    borderRadius: 10,
                    backgroundColor: '#fff8ef',
                    border: `1px solid ${priority.color}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong>أولوية التدخل</strong>

                    <span
                      style={{
                        color: priority.color,
                        fontWeight: 'bold',
                        fontSize: 18,
                      }}
                    >
                      {priority.label}
                    </span>
                  </div>

                  <p
                    style={{
                      marginBottom: 0,
                      color: '#66756b',
                    }}
                  >
                    {priority.description}
                  </p>
                </div>

                <p>
                  <strong>مستوى الخطر:</strong>{' '}
                  <span
                    style={{
                      color:
                        RISK_COLORS[site.risk] || '#287a4b',
                      fontWeight: 'bold',
                    }}
                  >
                    {site.risk}
                  </span>
                </p>

                {mainFactors.length > 0 && (
                  <div
                    style={{
                      margin: '15px 0',
                      padding: 16,
                      backgroundColor: '#f7faf8',
                      borderRadius: 10,
                      border: '1px solid #dce8df',
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>
                      أهم عوامل الخطر
                    </h4>

                    {mainFactors.map(factor => (
                      <div
                        key={factor.label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid #e5ece7',
                        }}
                      >
                        <span>{factor.label}</span>

                        <span
                          style={{
                            fontWeight: 'bold',
                            color:
                              factor.value >= 3
                                ? '#c0392b'
                                : factor.value === 2
                                  ? '#d68910'
                                  : '#287a4b',
                          }}
                        >
                          {factor.value}/4
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    margin: '15px 0',
                    padding: 16,
                    backgroundColor: '#eef7f0',
                    borderRadius: 10,
                    border: '1px solid #c8dfce',
                  }}
                >
                  <h4 style={{ marginTop: 0 }}>
                    توصيات التدخل
                  </h4>

                  <ol
                    style={{
                      paddingRight: 22,
                      marginBottom: 0,
                    }}
                  >
                    {recommendations.map(
                      (recommendation, index) => (
                        <li
                          key={`${site.id}-recommendation-${index}`}
                          style={{
                            marginBottom: 8,
                            lineHeight: 1.7,
                          }}
                        >
                          {recommendation}
                        </li>
                      ),
                    )}
                  </ol>
                </div>

                <p>
                  <strong>الحرق:</strong>{' '}
                  {site.burning !== undefined
                    ? `${site.burning} / 4`
                    : 'غير مسجل'}
                </p>

                <p>
                  <strong>التسرب:</strong>{' '}
                  {site.leakage !== undefined
                    ? `${site.leakage} / 4`
                    : 'غير مسجل'}
                </p>

                <p>{site.description}</p>

                <p>
                  <strong>خط العرض:</strong>{' '}
                  {site.latitude || 'غير محدد'}
                </p>

                <p>
                  <strong>خط الطول:</strong>{' '}
                  {site.longitude || 'غير محدد'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <button
                    onClick={() => printSiteReport(site)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#287a4b',
                    }}
                  >
                    إنشاء تقرير PDF
                  </button>

                  <button
                    onClick={() => deleteSite(site.id)}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#b83232',
                    }}
                  >
                    حذف الموقع
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string
  value: string | number
  color: string
}) {
  return (
    <div style={cardStyle}>
      <h3>{title}</h3>

      <div
        style={{
          ...numberStyle,
          color,
        }}
      >
        {value}
      </div>
    </div>
  )
}

const headerStyle = {
  backgroundColor: '#fff',
  padding: '15px 30px',
  display: 'flex',
  alignItems: 'center',
  gap: 15,
  borderBottom: '1px solid #dce8df',
}

const mainStyle = {
  maxWidth: 1200,
  margin: 'auto',
  padding: 30,
}

const cardStyle = {
  backgroundColor: '#fff',
  padding: 25,
  borderRadius: 12,
  border: '1px solid #dce8df',
  marginBottom: 20,
}

const innerCardStyle = {
  backgroundColor: '#f4f8f5',
  padding: 20,
  borderRadius: 10,
  border: '1px solid #dce8df',
}

const numberStyle = {
  fontSize: 32,
  fontWeight: 'bold' as const,
}

const buttonStyle = {
  backgroundColor: '#287a4b',
  color: '#fff',
  border: 'none',
  padding: '12px 25px',
  borderRadius: 8,
  fontSize: 16,
  cursor: 'pointer',
  marginBottom: 15,
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: 12,
  marginBottom: 15,
  border: '1px solid #ccd9d0',
  borderRadius: 8,
  fontSize: 15,
}

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  fontWeight: 'bold' as const,
}

const dashboardTableCellStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #dce7df',
  textAlign: 'right' as const,
}

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 20,
  margin: '25px 0',
}

const filtersStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 15,
}

const siteStyle = {
  borderBottom: '1px solid #e1e8e3',
  padding: '15px 0',
}

const mutedStyle = {
  color: '#66756b',
}

export default App
