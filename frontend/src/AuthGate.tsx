
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

  const changeMode = (newMode: Mode) => {
    setMode(newMode)
    setMessage('')
    setErrorMessage('')
  }

  if (checking) {
    return (
      <div dir="rtl" className="wafa-loading">
        <img src={logo} alt="WAFA ECOSPACE" />
        <p>جارٍ التحقق من تسجيل الدخول...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <main dir="rtl" className="wafa-page">
        <style>{`
          * { box-sizing: border-box; }

          .wafa-page {
            min-height: 100vh;
            padding: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #e5f7e9 0%, #f7fcf8 48%, #d9f1df 100%);
            font-family: Arial, sans-serif;
          }

          .wafa-layout {
            width: 100%;
            max-width: 1250px;
            min-height: 680px;
            display: flex;
            overflow: hidden;
            border-radius: 28px;
            background: white;
            box-shadow: 0 20px 65px rgba(20, 100, 55, .13);
          }

          .wafa-brand {
            flex: 1.15;
            padding: 42px 38px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: #155b35;
            background: linear-gradient(145deg, #effcf0, #d8f3dd, #f8fff8);
            border-left: 1px solid #d9eddd;
          }

          .wafa-brand-title {
            color: #087b3c;
            font-size: clamp(27px, 3vw, 38px);
            font-weight: 900;
            letter-spacing: 1px;
            margin: 0 0 22px;
          }

          .wafa-description {
            width: 100%;
            max-width: 570px;
            padding: 19px 23px;
            border: 1px solid #a9dcb5;
            border-radius: 20px;
            background: rgba(255,255,255,.76);
            color: #205d37;
            font-size: 17px;
            font-weight: bold;
            line-height: 2;
            margin-bottom: 23px;
          }

          .wafa-features {
            width: 100%;
            max-width: 590px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .wafa-feature {
            min-height: 105px;
            padding: 16px 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 9px;
            border: 1px solid #c7e9cd;
            border-radius: 17px;
            background: rgba(255,255,255,.9);
            box-shadow: 0 5px 15px rgba(35, 120, 65, .07);
            color: #205d37;
            font-size: 14px;
            font-weight: bold;
            line-height: 1.8;
            transition: transform .2s, box-shadow .2s;
          }

          .wafa-feature:hover {
            transform: translateY(-3px);
            box-shadow: 0 9px 20px rgba(35, 120, 65, .12);
          }

          .wafa-feature-icon {
            font-size: 29px;
          }

          .wafa-location {
            margin-top: 23px;
            padding: 10px 23px;
            border-radius: 30px;
            color: #247448;
            background: #e6f7e9;
            font-size: 13px;
            font-weight: bold;
          }

          .wafa-form-panel {
            flex: .85;
            min-width: 0;
            padding: 45px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #ffffff, #fafffb);
          }

          .wafa-logo {
            width: 155px;
            height: 155px;
            object-fit: contain;
            padding: 8px;
            border-radius: 28px;
            background: white;
            filter: drop-shadow(0 9px 14px rgba(20, 110, 55, .12));
            margin-bottom: 9px;
          }

          .wafa-form-title {
            color: #17683b;
            font-size: 27px;
            text-align: center;
            margin: 10px 0;
          }

          .wafa-form-description {
            color: #788b7e;
            font-size: 14px;
            line-height: 1.9;
            text-align: center;
            margin: 0 0 22px;
          }

          .wafa-tabs {
            width: 100%;
            display: flex;
            gap: 8px;
            padding: 5px;
            margin-bottom: 25px;
            background: #edf7ef;
            border-radius: 13px;
          }

          .wafa-tab {
            flex: 1;
            padding: 13px 8px;
            border: none;
            border-radius: 10px;
            background: transparent;
            color: #52725d;
            font-size: 14px;
            cursor: pointer;
          }

          .wafa-tab.active {
            color: white;
            background: linear-gradient(135deg, #36a761, #087a3b);
            box-shadow: 0 4px 10px rgba(15, 125, 60, .17);
            font-weight: bold;
          }

          .wafa-form {
            width: 100%;
          }

          .wafa-field {
            margin-bottom: 17px;
          }

          .wafa-label {
            display: block;
            margin-bottom: 10px;
            color: #28563a;
            font-size: 14px;
            font-weight: bold;
          }

          .wafa-input {
            width: 100%;
            padding: 16px;
            border: 1px solid #d5e8d9;
            border-radius: 12px;
            background: #fbfefb;
            color: #294a34;
            font-size: 15px;
            outline: none;
            transition: border .2s, box-shadow .2s;
          }

          .wafa-input:focus {
            border-color: #45a96b;
            box-shadow: 0 0 0 3px rgba(69,169,107,.12);
          }

          .wafa-input.email {
            direction: ltr;
            text-align: left;
          }

          .wafa-hint {
            color: #788b7e;
            font-size: 12px;
            line-height: 1.9;
            margin: 10px 0 17px;
          }

          .wafa-submit {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            color: white;
            background: linear-gradient(135deg, #39aa62, #087a3b);
            box-shadow: 0 6px 16px rgba(15, 125, 60, .17);
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            transition: transform .2s;
          }

          .wafa-submit:hover:not(:disabled) {
            transform: translateY(-2px);
          }

          .wafa-submit:disabled {
            opacity: .6;
            cursor: not-allowed;
          }

          .wafa-success, .wafa-error {
            width: 100%;
            margin-top: 17px;
            padding: 14px;
            border-radius: 11px;
            font-size: 13px;
            line-height: 1.9;
          }

          .wafa-success {
            background: #e8f8ec;
            color: #21683c;
            border: 1px solid #c7e9cf;
          }

          .wafa-error {
            background: #fff0f0;
            color: #b83232;
          }

          .wafa-footer {
            margin-top: 35px;
            color: #87958b;
            text-align: center;
            font-size: 12px;
            line-height: 2;
          }

          .wafa-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f1faf3;
            color: #287a4b;
            font-family: Arial, sans-serif;
          }

          .wafa-loading img {
            width: 100px;
            height: 100px;
            object-fit: contain;
          }

          @media (max-width: 850px) {
            .wafa-page { padding: 12px; }
            .wafa-layout { flex-direction: column; }
            .wafa-brand { order: 1; padding: 35px 20px; }
            .wafa-form-panel { order: 2; padding: 35px 24px; }
            .wafa-features { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .wafa-logo { width: 125px; height: 125px; }
          }

          @media (max-width: 430px) {
            .wafa-features { grid-template-columns: 1fr; }
            .wafa-feature { min-height: 80px; }
            .wafa-form-panel { padding: 30px 18px; }
          }
        `}</style>

        <section className="wafa-layout">

          {/* الجهة اليمنى: تعريف المنصة */}
          <div className="wafa-brand">
            <h1 className="wafa-brand-title">WAFA ECOSPACE</h1>

            <div className="wafa-description">
              منصة جغرافية لرصد المفرغات العشوائية والمساهمة في التقليل والحد من الأخطار البيئية الناتجة عنها، من خلال:
            </div>

            <div className="wafa-features">
              <div className="wafa-feature">
                <span className="wafa-feature-icon">🗺️</span>
                <span>نظم المعلومات الجغرافية (GIS)</span>
              </div>

              <div className="wafa-feature">
                <span className="wafa-feature-icon">🛰️</span>
                <span>الاستشعار عن بعد والأقمار الصناعية</span>
              </div>

              <div className="wafa-feature">
                <span className="wafa-feature-icon">♻️</span>
                <span>الوساطة بين مؤسسات الجمع ومؤسسات إعادة التدوير</span>
              </div>

              <div className="wafa-feature">
                <span className="wafa-feature-icon">🗄️</span>
                <span>قاعدة بيانات لكل فاعل في هذا النظام</span>
              </div>

              <div className="wafa-feature">
                <span className="wafa-feature-icon">🌱</span>
                <span>مؤشرات الغطاء النباتي (NDVI)</span>
              </div>

              <div className="wafa-feature">
                <span className="wafa-feature-icon">🌍</span>
                <span>متابعة المخاطر البيئية</span>
              </div>
            </div>

            <div className="wafa-location">
              ولاية غليزان – الجزائر
            </div>
          </div>

          {/* الجهة اليسرى: تسجيل الدخول وإنشاء الحساب */}
          <div className="wafa-form-panel">
            <img
              src={logo}
              alt="شعار WAFA ECOSPACE"
              className="wafa-logo"
            />

            <h2 className="wafa-form-title">
              {mode === 'login' ? 'مرحباً بعودتك!' : 'إنشاء حساب جديد'}
            </h2>

            <p className="wafa-form-description">
              {mode === 'login'
                ? 'سجلي الدخول للوصول إلى منصتك البيئية.'
                : 'انضمي إلى منصة WAFA ECOSPACE.'}
            </p>

            <div className="wafa-tabs">
              <button
                type="button"
                onClick={() => changeMode('login')}
                className={`wafa-tab ${mode === 'login' ? 'active' : ''}`}
              >
                تسجيل الدخول
              </button>

              <button
                type="button"
                onClick={() => changeMode('signup')}
                className={`wafa-tab ${mode === 'signup' ? 'active' : ''}`}
              >
                إنشاء حساب
              </button>
            </div>

            <form onSubmit={handleSubmit} className="wafa-form">

              {mode === 'signup' && (
                <div className="wafa-field">
                  <label className="wafa-label">الاسم الكامل</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخلي اسمك الكامل"
                    required
                    className="wafa-input"
                  />
                </div>
              )}

              <div className="wafa-field">
                <label className="wafa-label">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="wafa-input email"
                />
              </div>

              <p className="wafa-hint">
                سنرسل إليك رابطاً آمناً إلى بريدك الإلكتروني.
                افتحي الرسالة واضغطي على الرابط للدخول إلى المنصة،
                دون الحاجة إلى كلمة مرور.
              </p>

              <button
                type="submit"
                disabled={sending}
                className="wafa-submit"
              >
                {sending
                  ? 'جارٍ إرسال الرابط...'
                  : mode === 'login'
                    ? 'إرسال رابط تسجيل الدخول'
                    : 'إرسال رابط إنشاء الحساب'}
              </button>
            </form>

            {message && (
              <div className="wafa-success">{message}</div>
            )}

            {errorMessage && (
              <div className="wafa-error">{errorMessage}</div>
            )}

            <div className="wafa-footer">
              WAFA ECOSPACE © 2026
              <br />
              منصة جغرافية للإدارة البيئية المستدامة
              <br />
              معاً نحو بيئة أكثر استدامة 🌿
            </div>
          </div>

        </section>
      </main>
    )
  }

  return (
    <>
      <div dir="rtl" style={styles.accountBar}>
        <span>تم تسجيل الدخول: {session.user.email}</span>
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
