import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, isAuthConfigured, signIn, signOut, signUp } from '../lib/supabaseAuth'
import { Icon } from '../components/Icon'

type Mode = 'signIn' | 'signUp'

export default function AccountPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ id: string; email: string | null } | null | undefined>(undefined)
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function refresh() {
    setUser(await getCurrentUser())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password)
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.')
    } else if (mode === 'signUp') {
      setInfo('Account created. Check your email to confirm, then sign in.')
      setMode('signIn')
    } else {
      setEmail('')
      setPassword('')
      await refresh()
    }
    setBusy(false)
  }

  async function onSignOut() {
    setBusy(true)
    await signOut()
    await refresh()
    setBusy(false)
  }

  if (!isAuthConfigured()) {
    return (
      <main className="page">
        <div className="page-header-row">
          <div className="page-icon-badge"><Icon name="user" size={22} /></div>
          <div className="page-header">
            <h1 className="page-title">Account</h1>
          </div>
        </div>
        <p className="card-info">
          No Supabase project is configured for this app, so cloud accounts aren't available. The app works fully
          offline without one — this only matters for attributing synced records to a specific health worker.
        </p>
        <button type="button" onClick={() => navigate('/')} className="btn btn-secondary btn-lg btn-block">
          {'←'} Back
        </button>
      </main>
    )
  }

  if (user === undefined) return null

  if (user) {
    return (
      <main className="page">
        <div className="page-header-row">
          <div className="page-icon-badge"><Icon name="user" size={22} /></div>
          <div className="page-header">
            <h1 className="page-title">Account</h1>
            <p className="page-subtitle">Signed in as {user.email}</p>
          </div>
        </div>
        <p className="card-info">
          New patients you register will be attributed to this account for cloud sync. Signing out doesn't delete
          anything already saved on this device.
        </p>
        <button type="button" onClick={onSignOut} disabled={busy} className="btn btn-secondary btn-lg btn-block">
          Sign out
        </button>
        <button type="button" onClick={() => navigate('/')} className="btn btn-primary btn-lg btn-block">
          {'←'} Back to patients
        </button>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header-row">
        <div className="page-icon-badge"><Icon name="user" size={22} /></div>
        <div className="page-header">
          <h1 className="page-title">{mode === 'signIn' ? 'Sign in' : 'Create an account'}</h1>
          <p className="page-subtitle">
            Optional — the app works fully offline without this. Signing in attributes the patients you register to
            your account, so cloud-synced data can be scoped per health worker.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="section">
        <div className="field">
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 14 }}>{error}</p>}
        {info && <p style={{ color: 'var(--color-success)', fontSize: 14 }}>{info}</p>}

        <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">
          {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(null); setInfo(null) }}
        style={{ background: 'none', border: 'none', color: 'var(--color-ink-soft)', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}
      >
        {mode === 'signIn' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
      </button>

      <button type="button" onClick={() => navigate('/')} className="btn btn-secondary btn-lg btn-block">
        {'←'} Back
      </button>
    </main>
  )
}
