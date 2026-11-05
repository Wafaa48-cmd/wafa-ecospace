
import {
    useEffect,
    useState,
    type FormEvent,
    type ReactNode,
  } from 'react'
  import type { Session } from '@supabase/supabase-js'
  import { supabase } from './supabase'
  
  type Props = {
    children: ReactNode
  }
  
  export default function AuthGate({ children }: Props) {
    const [session, setSession] = useState<Session | null>(null)
    const [checking, setChecking] = useState(true)
    const [email, setEmail] = useState('')
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
  
    useEffect(() => {
      let active = true
  
      const checkSession = async () => {
        const { data, error } = await supabase.auth.getSession()
  
        if (!active) return
  
        if (error) {
          setErrorMessage(error.message)
        }
  
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
  
    const sendLoginLink = async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()
      setMessage('')
      setErrorMessage('')
  
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
            shouldCreateUser: false,
          },
        })
  
        if (error) {
          setErrorMessage(error.message)
        } else {
          setMessage(
            'تم إرسال رابط الدخول إلى بريدك الإلكتروني. افتحي الرسالة واضغطي على رابط تسجيل الدخول.',
          )
        }
      } catch {
        setErrorMessage(
          'تعذر إرسال رابط الدخول. تحققي من الاتصال بالإنترنت وحاولي مجددًا.',
        )
      } finally {
        setSending(false)
      }
    }
  
    const logout = async () => {
      const { error } = await supabase.auth.signOut()
  
      if (error) {
        setErrorMessage(error.message)
      }
    }
  
    if (checking) {
      return (
        <div dir="rtl" style={pageStyle}>
          جارٍ التحقق من تسجيل الدخول...
        </div>
      )
    }
  
    if (!session) {
      return (
        <div dir="rtl" style={pageStyle}>
          <div style={loginCardStyle}>
            <h1 style={{ color: '#287a4b' }}>
              WAFA ECOSPACE
            </h1>
  
            <h2>تسجيل الدخول</h2>
  
            <p>
              أدخلي البريد الإلكتروني المسجل في حساب
              Supabase لإرسال رابط الدخول.
            </p>
  
            <form onSubmit={sendLoginLink}>
              <label style={labelStyle}>
                البريد الإلكتروني
              </label>
  
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="example@email.com"
                required
                style={inputStyle}
              />
  
              <button
                type="submit"
                disabled={sending}
                style={buttonStyle}
              >
                {sending
                  ? 'جارٍ إرسال الرابط...'
                  : 'إرسال رابط تسجيل الدخول'}
              </button>
            </form>
  
            {message && (
              <p style={{ color: '#287a4b', lineHeight: 1.7 }}>
                {message}
              </p>
            )}
  
            {errorMessage && (
              <p style={{ color: '#c0392b', lineHeight: 1.7 }}>
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      )
    }
  
    return (
      <>
        <div dir="rtl" style={accountBarStyle}>
          <span>
            تم تسجيل الدخول:
            {' '}
            {session.user.email}
          </span>
  
          <button onClick={logout} style={logoutButtonStyle}>
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
  
  const pageStyle = {
    minHeight: '100vh',
    backgroundColor: '#f4f8f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  }
  
  const loginCardStyle = {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 14,
    border: '1px solid #dce8df',
    boxSizing: 'border-box' as const,
    textAlign: 'center' as const,
  }
  
  const labelStyle = {
    display: 'block',
    textAlign: 'right' as const,
    marginBottom: 8,
    fontWeight: 'bold' as const,
  }
  
  const inputStyle = {
    width: '100%',
    padding: 13,
    boxSizing: 'border-box' as const,
    border: '1px solid #ccd9d0',
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  }
  
  const buttonStyle = {
    width: '100%',
    padding: 13,
    backgroundColor: '#287a4b',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    cursor: 'pointer',
  }
  
  const accountBarStyle = {
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
  }
  
  const logoutButtonStyle = {
    padding: '7px 14px',
    backgroundColor: '#ffffff',
    color: '#b83232',
    border: '1px solid #b83232',
    borderRadius: 6,
    cursor: 'pointer',
  }
  