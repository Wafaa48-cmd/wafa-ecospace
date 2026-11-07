import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import logo from './assets/logo.png.jpg'

type Props = {
  children: ReactNode
}

type Mode = 'login' | 'signup'

export default function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let active = true

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!active) return

      if (error) setErrorMessage(error.message)

      setSession(data.session)
      setChecking(false)
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return

      setSession(newSession)
      setChecking(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('يرجى إدخال الاسم الكامل.')
      return
    }

    if (!email.trim()) {
      setErrorMessage('يرجى إدخال البريد الإلكتروني.')
      return
    }

    setSending(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: mode === 'signup',
          data:
            mode === 'signup'
              ? { full_name: fullName.trim() }
              : undefined,
        },
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        setMessage(
          mode === 'signup'
            ? 'تم إرسال رابط إنشاء الحساب إلى بريدك الإلكتروني. افتحي الرسالة لتأكيد الحساب.'
            : 'تم إرسال رابط الدخول إلى بريدك الإلكتروني. افتحي الرسالة لإتمام تسجيل الدخول.'
        )
      }
    } catch {
      setErrorMessage('تعذر إتمام العملية. تحققي من اتصال الإنترنت وحاولي مجدداً.')
    } finally {
      setSending(false)
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) setErrorMessage(error.message)
  }

  if (checking) {
    return (
      <div dir="rtl" style={styles.loading}>
        <img src={logo} alt="WAFA ECOSPACE" style={styles.loadingLogo} />
        <p>جارٍ التحقق من تسجيل الدخول...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <main dir="rtl" style={styles.page}>
        <section style={styles.layout}>

          <div style={styles.brandPanel}>
            <img src={logo} alt="شعار WAFA ECOSPACE" style={styles.logo} />

            <h1 style={styles.brandTitle}>WAFA ECOSPACE</h1>

            <h2 style={styles.brandSubtitle}>
              نحو بيئة أنظف ومستقبل أكثر استدامة
            </h2>

            <p style={styles.brandDescription}>
              منصة جغرافية ذكية لمراقبة المفرغات العشوائية
              وإدارة المخاطر البيئية في ولاية غليزان.
            </p>

            <div style={styles.features}>
              <div>🌍 نظم المعلومات الجغرافية GIS</div>
              <div>🛰️ الاستشعار عن بعد والأقمار الصناعية</div>
              <div>♻️ إدارة النفايات وإعادة التدوير</div>
              <div>🌱 متابعة المخاطر البيئية</div>
            </div>

            <div style={styles.location}>
              ولاية غليزان – الجزائر
            </div>
          </div>

          <div style={styles.formPanel}>
            <div style={styles.formLogo}>
              <img src={logo} alt="الشعار" style={styles.smallLogo} />
            </div>

            <h2 style={styles.formTitle}>
              {mode === 'login' ? 'مرحباً بعودتك!' : 'إنشاء حساب جديد'}
            </h2>

            <p style={styles.formDescription}>
              {mode === 'login'
                ? 'سجلي الدخول للوصول إلى منصتك البيئية.'
                : 'انضمي إلى منصة WAFA ECOSPACE.'}
            </p>

            <div style={styles.tabs}>
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setMessage('')
                  setErrorMessage('')
                }}
                style={mode === 'login' ? styles.activeTab : styles.tab}
              >
                تسجيل الدخول
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setMessage('')
                  setErrorMessage('')
                }}
                style={mode === 'signup' ? styles.activeTab : styles.tab}
              >
                إنشاء حساب
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <div style={styles.field}>
                  <label style={styles.label}>الاسم الكامل</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخلي اسمك الكامل"
                    required
                    style={styles.input}
                  />
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  style={styles.input}
                />
              </div>

              <p style={styles.hint}>
                سنرسل إليك رابطاً آمناً إلى بريدك الإلكتروني لإتمام العملية.
              </p>

              <button
                type="submit"
                disabled={sending}
                style={{
                  ...styles.submitButton,
                  opacity: sending ? 0.65 : 1,
                }}
              >
                {sending
                  ? 'جارٍ الإرسال...'
                  : mode === 'login'
                    ? 'إرسال رابط تسجيل الدخول'
                    : 'إرسال رابط إنشاء الحساب'}
              </button>
            </form>

            {message && (
              <div style={styles.success}>
                {message}
              </div>
            )}

            {errorMessage && (
              <div style={styles.error}>
                {errorMessage}
              </div>
            )}

            <p style={styles.footer}>
              WAFA ECOSPACE © 2026
              <br />
              منصة جغرافية للإدارة البيئية المستدامة
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <>
      <div dir="rtl" style={styles.accountBar}>
        <span>
          تم تسجيل الدخول: {session.user.email}
        </span>

        <button onClick={logout} style={styles.logoutButton}>
          تسجيل الخروج
        </button>
      </div>

      {children}

      {errorMessage && (
        <p style={{ color: '#c0392b', textAlign: 'center' }}>
          {errorMessage}
        </p>
      )}
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #eaf4ed, #f7faf8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box' as const,
  },
  layout: {
    width: '100%',
    maxWidth: 1050,
    minHeight: 590,
    display: 'flex',
    flexWrap: 'wrap' as const,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden' as const,
    boxShadow: '0 15px 50px rgba(30,80,50,0.12)',
  },
  brandPanel: {
    flex: '1 1 350px',
    minWidth: 0,
    padding: 40,
    background: 'linear-gradient(145deg, #145b37, #238653)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
  },
  logo: {
    width: 125,
    height: 125,
    objectFit: 'contain' as const,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 8,
  },
  brandTitle: {
    fontSize: 27,
    letterSpacing: 1,
    marginTop: 20,
  },
  brandSubtitle: {
    fontSize: 20,
    lineHeight: 1.8,
  },
  brandDescription: {
    fontSize: 15,
    lineHeight: 2,
    color: '#e2f5e9',
  },
  features: {
    width: '100%',
    textAlign: 'right' as const,
    lineHeight: 3,
    fontSize: 14,
    marginTop: 15,
  },
  location: {
    marginTop: 20,
    padding: '10px 20px',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: 30,
    fontSize: 13,
  },
  formPanel: {
    flex: '1 1 350px',
    minWidth: 0,
    padding: 40,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    boxSizing: 'border-box' as const,
  },
  formLogo: {
    textAlign: 'center' as const,
  },
  smallLogo: {
    width: 65,
    height: 65,
    objectFit: 'contain' as const,
  },
  formTitle: {
    color: '#195d39',
    fontSize: 25,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  formDescription: {
    color: '#718078',
    textAlign: 'center' as const,
    fontSize: 14,
    lineHeight: 1.8,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    margin: '25px 0',
    padding: 5,
    backgroundColor: '#edf4ef',
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    padding: 12,
    border: 'none',
    background: 'transparent',
    color: '#557060',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  activeTab: {
    flex: 1,
    padding: 12,
    border: 'none',
    backgroundColor: '#287a4b',
    color: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    marginBottom: 9,
    color: '#294c36',
    fontWeight: 'bold' as const,
    fontSize: 14,
  },
  input: {
    width: '100%',
    padding: 14,
    border: '1px solid #d5e3d9',
    borderRadius: 9,
    boxSizing: 'border-box' as const,
    fontSize: 15,
    outlineColor: '#287a4b',
    backgroundColor: '#fbfdfb',
  },
  hint: {
    fontSize: 12,
    color: '#78877d',
    lineHeight: 1.8,
  },
  submitButton: {
    width: '100%',
    padding: 15,
    backgroundColor: '#287a4b',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    fontSize: 15,
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    marginTop: 12,
  },
  success: {
    marginTop: 18,
    padding: 13,
    backgroundColor: '#e7f6ec',
    color: '#21683c',
    borderRadius: 8,
    lineHeight: 1.8,
    fontSize: 13,
  },
  error: {
    marginTop: 18,
    padding: 13,
    backgroundColor: '#fff0f0',
    color: '#b83232',
    borderRadius: 8,
    lineHeight: 1.8,
    fontSize: 13,
  },
  footer: {
    textAlign: 'center' as const,
    color: '#87958b',
    fontSize: 12,
    lineHeight: 2,
    marginTop: 35,
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f8f5',
    color: '#287a4b',
    fontFamily: 'Arial, sans-serif',
  },
  loadingLogo: {
    width: 85,
    height: 85,
    objectFit: 'contain' as const,
  },
  accountBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: 10,
    padding: '10px 20px',
    backgroundColor: '#eaf3ec',
    color: '#1f3d2b',
    fontFamily: 'Arial, sans-serif',
    fontSize: 13,
  },
  logoutButton: {
    padding: '7px 14px',
    backgroundColor: '#fff',
    color: '#b83232',
    border: '1px solid #b83232',
    borderRadius: 6,
    cursor: 'pointer',
  },
}