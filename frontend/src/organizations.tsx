
import { useEffect, useState } from 'react'
import type { Site } from './App'
import { supabase } from './supabase'

type Organization = {
  id: string
  name: string
  organization_type: 'collection' | 'recycling'
  waste_types: string[] | null
  wilaya: string
  commune: string | null
  address: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  capacity: string | null
  coverage_area: string | null
  verification_status: string
}

type Request = {
  id: string
  site_id: number
  organization_id: string
  status: string
  notes: string | null
  created_at: string
}

const emptyForm = {
  name: '',
  organization_type: 'collection' as 'collection' | 'recycling',
  commune: '',
  address: '',
  phone: '',
  email: '',
  waste_types: '',
  capacity: '',
  coverage_area: '',
  latitude: '',
  longitude: '',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: 11,
  marginBottom: 12,
  border: '1px solid #ccd9d0',
  borderRadius: 8,
  fontSize: 15,
}

const buttonStyle = {
  background: '#287a4b',
  color: 'white',
  border: 0,
  borderRadius: 8,
  padding: '11px 18px',
  cursor: 'pointer',
  margin: '4px',
}

const cardStyle = {
  background: 'white',
  border: '1px solid #dce8df',
  borderRadius: 12,
  padding: 20,
  marginBottom: 18,
}

export default function Organizations({
  sites,
  userId,
  onBack,
}: {
  sites: Site[]
  userId: string
  onBack: () => void
}) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [selectedSite, setSelectedSite] = useState('')
  const [selectedOrganization, setSelectedOrganization] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)

    const [orgResult, requestResult] = await Promise.all([
      supabase
        .from('environmental_organizations')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('intervention_requests')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    if (orgResult.error) {
      window.alert('تعذر تحميل المؤسسات: ' + orgResult.error.message)
    } else {
      setOrganizations((orgResult.data ?? []) as Organization[])
    }

    if (requestResult.error) {
      window.alert('تعذر تحميل طلبات التدخل: ' + requestResult.error.message)
    } else {
      setRequests((requestResult.data ?? []) as Request[])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const addOrganization = async () => {
    if (!form.name.trim() || !form.commune.trim()) {
      window.alert('يرجى إدخال اسم المؤسسة والبلدية.')
      return
    }

    const latitude = form.latitude.trim() ? Number(form.latitude) : null
    const longitude = form.longitude.trim() ? Number(form.longitude) : null

    if (
      (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      window.alert('تحققي من الإحداثيات المدخلة.')
      return
    }

    const { error } = await supabase
      .from('environmental_organizations')
      .insert({
        user_id: userId,
        name: form.name.trim(),
        organization_type: form.organization_type,
        commune: form.commune.trim(),
        wilaya: 'غليزان',
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        waste_types: form.waste_types
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        capacity: form.capacity.trim() || null,
        coverage_area: form.coverage_area.trim() || null,
        latitude,
        longitude,
        verification_status: 'unverified',
      })

    if (error) {
      window.alert('تعذر حفظ المؤسسة: ' + error.message)
      return
    }

    window.alert('تمت إضافة المؤسسة بنجاح.')
    setForm(emptyForm)
    setShowForm(false)
    await loadData()
  }

  const sendRequest = async () => {
    const siteId = Number(selectedSite)

    if (!selectedSite || !selectedOrganization) {
      window.alert('اختاري المفرغة والمؤسسة أولًا.')
      return
    }

    const { error } = await supabase
      .from('intervention_requests')
      .insert({
        user_id: userId,
        site_id: siteId,
        organization_id: selectedOrganization,
        status: 'sent',
        notes: requestNotes.trim() || null,
      })

    if (error) {
      window.alert('تعذر تسجيل طلب التدخل: ' + error.message)
      return
    }

    window.alert('تم تسجيل طلب الإحالة في المنصة.')
    setSelectedSite('')
    setSelectedOrganization('')
    setRequestNotes('')
    await loadData()
  }

  const updateStatus = async (requestId: string, status: string) => {
    const { error } = await supabase
      .from('intervention_requests')
      .update({ status })
      .eq('id', requestId)
      .eq('user_id', userId)

    if (error) {
      window.alert('تعذر تحديث الحالة: ' + error.message)
      return
    }

    await loadData()
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      (org.commune ?? '').toLowerCase().includes(search.toLowerCase())

    return matchesSearch && (!filter || org.organization_type === filter)
  })

  const collectionCount = organizations.filter(
    org => org.organization_type === 'collection',
  ).length

  const recyclingCount = organizations.filter(
    org => org.organization_type === 'recycling',
  ).length

  const statusLabels: Record<string, string> = {
    sent: 'مرسل داخل المنصة',
    accepted: 'مقبول',
    in_progress: 'قيد التدخل',
    completed: 'مكتمل',
    rejected: 'مرفوض',
  }

  const organizationName = (id: string) =>
    organizations.find(org => org.id === id)?.name ?? 'مؤسسة غير معروفة'

  const siteName = (id: number) =>
    sites.find(site => site.id === id)?.name ?? `الموقع رقم ${id}`

  return (
    <main dir="rtl" style={{ maxWidth: 1200, margin: 'auto', padding: 25, color: '#1f3d2b', fontFamily: 'Arial' }}>
      <button style={buttonStyle} onClick={onBack}>العودة إلى لوحة التحكم</button>

      <h1>دليل المؤسسات البيئية</h1>
      <p style={{ color: '#66756b' }}>مؤسسات جمع النفايات وإعادة التثمين في ولاية غليزان</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <div style={cardStyle}><strong>إجمالي المؤسسات</strong><h2>{organizations.length}</h2></div>
        <div style={cardStyle}><strong>مؤسسات الجمع</strong><h2>{collectionCount}</h2></div>
        <div style={cardStyle}><strong>مؤسسات إعادة التثمين</strong><h2>{recyclingCount}</h2></div>
        <div style={cardStyle}><strong>طلبات التدخل المسجلة</strong><h2>{requests.length}</h2></div>
      </div>

      <section style={cardStyle}>
        <h2>إضافة مؤسسة بيئية</h2>
        <button style={buttonStyle} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'إغلاق النموذج' : '+ إضافة مؤسسة جديدة'}
        </button>

        {showForm && (
          <div style={{ marginTop: 15 }}>
            <input style={inputStyle} placeholder="اسم المؤسسة" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <select style={inputStyle} value={form.organization_type} onChange={e => setForm({ ...form, organization_type: e.target.value as 'collection' | 'recycling' })}>
              <option value="collection">جمع النفايات</option>
              <option value="recycling">إعادة التثمين والتدوير</option>
            </select>

            <input style={inputStyle} placeholder="البلدية" value={form.commune} onChange={e => setForm({ ...form, commune: e.target.value })} />
            <input style={inputStyle} placeholder="العنوان" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input style={inputStyle} placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input style={inputStyle} placeholder="البريد الإلكتروني" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="أنواع النفايات (افصلي بينها بفاصلة)" value={form.waste_types} onChange={e => setForm({ ...form, waste_types: e.target.value })} />
            <input style={inputStyle} placeholder="القدرة الاستيعابية" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            <input style={inputStyle} placeholder="منطقة التغطية" value={form.coverage_area} onChange={e => setForm({ ...form, coverage_area: e.target.value })} />
            <input style={inputStyle} placeholder="خط العرض (اختياري)" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
            <input style={inputStyle} placeholder="خط الطول (اختياري)" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />

            <button style={buttonStyle} onClick={addOrganization}>حفظ المؤسسة</button>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2>البحث في المؤسسات</h2>
        <input style={inputStyle} placeholder="ابحث باسم المؤسسة أو البلدية..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={inputStyle} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">جميع المؤسسات</option>
          <option value="collection">مؤسسات الجمع</option>
          <option value="recycling">مؤسسات إعادة التثمين</option>
        </select>

        {loading ? <p>جارٍ تحميل المؤسسات...</p> : filteredOrganizations.length === 0 ? <p>لا توجد مؤسسات مسجلة بعد. يمكنك إضافة أول مؤسسة.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 550 }}>
              <thead>
                <tr style={{ background: '#edf4ef', textAlign: 'right' }}>
                  {['المؤسسة', 'النشاط', 'البلدية', 'الهاتف', 'التحقق'].map(item => <th key={item} style={{ padding: 10 }}>{item}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredOrganizations.map(org => (
                  <tr key={org.id}>
                    <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{org.name}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{org.organization_type === 'collection' ? 'جمع النفايات' : 'إعادة التثمين'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{org.commune}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{org.phone || 'غير متوفر'}</td>
                    <td style={{ padding: 10, borderBottom: '1px solid #ddd' }}>{org.verification_status === 'verified' ? 'موثقة' : 'غير موثقة'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2>إحالة مفرغة إلى مؤسسة</h2>
        <p style={{ color: '#66756b' }}>يسجل هذا الإجراء طلب إحالة داخل المنصة، ولا يعني إرسال إشعار خارجي إلى المؤسسة.</p>

        <label>اختيار المفرغة</label>
        <select style={inputStyle} value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
          <option value="">اختاري المفرغة</option>
          {sites.map(site => <option key={site.id} value={site.id}>{site.name} — {site.commune}</option>)}
        </select>

        <label>اختيار المؤسسة</label>
        <select style={inputStyle} value={selectedOrganization} onChange={e => setSelectedOrganization(e.target.value)}>
          <option value="">اختاري المؤسسة</option>
          {organizations.map(org => <option key={org.id} value={org.id}>{org.name} ({org.organization_type === 'collection' ? 'جمع' : 'تثمين'})</option>)}
        </select>

        <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder="ملاحظات حول التدخل المطلوب (اختياري)" value={requestNotes} onChange={e => setRequestNotes(e.target.value)} />
        <button style={buttonStyle} onClick={sendRequest}>تسجيل طلب الإحالة</button>
      </section>

      <section style={cardStyle}>
        <h2>متابعة طلبات التدخل</h2>
        {requests.length === 0 ? <p>لا توجد طلبات تدخل مسجلة.</p> : requests.map(request => (
          <div key={request.id} style={{ borderBottom: '1px solid #ddd', padding: '14px 0' }}>
            <strong>{siteName(request.site_id)}</strong>
            <p>المؤسسة: {organizationName(request.organization_id)}</p>
            <p>الحالة الحالية: <strong>{statusLabels[request.status] ?? request.status}</strong></p>
            {request.notes && <p>ملاحظات: {request.notes}</p>}
            <label>تحديث الحالة</label>
            <select style={inputStyle} value={request.status} onChange={e => updateStatus(request.id, e.target.value)}>
              <option value="sent">مرسل داخل المنصة</option>
              <option value="accepted">مقبول</option>
              <option value="in_progress">قيد التدخل</option>
              <option value="completed">مكتمل</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        ))}
      </section>
    </main>
  )
}
