import { useEffect, useState, type ReactNode } from 'react'
import { isPinSet, setPin, verifyPin } from '../db/repositories/appSettings'

const PIN_LENGTH = 4
type Stage = 'loading' | 'create' | 'confirm' | 'locked' | 'unlocked'

export function PinGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [isReset, setIsReset] = useState(false)
  const [pin, setPinInput] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isPinSet().then((set) => setStage(set ? 'locked' : 'create'))
  }, [])

  function startOver() {
    setPinInput('')
    setFirstPin('')
    setStage('create')
  }

  async function onDigit(d: string) {
    if (pin.length >= PIN_LENGTH) return
    const next = pin + d
    setPinInput(next)
    setError(null)
    if (next.length !== PIN_LENGTH) return

    if (stage === 'create') {
      setFirstPin(next)
      setPinInput('')
      setStage('confirm')
      return
    }
    if (stage === 'confirm') {
      if (next !== firstPin) {
        setError("PINs didn't match — try again.")
        startOver()
        return
      }
      await setPin(next)
      setPinInput('')
      setStage('unlocked')
      return
    }
    if (stage === 'locked') {
      const ok = await verifyPin(next)
      if (ok) {
        setPinInput('')
        setStage('unlocked')
      } else {
        setError('Incorrect PIN.')
        setPinInput('')
      }
    }
  }

  function onBackspace() {
    setPinInput((p) => p.slice(0, -1))
  }

  function onForgotPin() {
    setIsReset(true)
    setError(null)
    startOver()
  }

  if (stage === 'loading') return null
  if (stage === 'unlocked') return <>{children}</>

  const title =
    stage === 'create' ? (isReset ? 'Enter a new PIN' : 'Set an app PIN') : stage === 'confirm' ? 'Re-enter the PIN to confirm' : 'Enter PIN'
  const subtitle =
    stage === 'create'
      ? isReset
        ? 'This resets the app PIN only — patient data is not affected.'
        : 'This keeps patient data private if this device is shared or lost. You can change it any time.'
      : ''

  return (
    <main className="page" style={{ justifyContent: 'center', minHeight: '100svh' }}>
      <div className="page-header" style={{ textAlign: 'center', alignItems: 'center' }}>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, margin: '8px 0 20px' }}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid var(--color-ink-faint)',
              background: i < pin.length ? 'var(--color-blue)' : 'transparent',
              borderColor: i < pin.length ? 'var(--color-blue)' : 'var(--color-ink-faint)',
            }}
          />
        ))}
      </div>

      {error && <p style={{ color: 'var(--color-danger)', textAlign: 'center', fontSize: 14 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, maxWidth: 280, margin: '0 auto' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="btn btn-secondary" style={{ width: '100%', minHeight: 64, fontSize: 22 }} onClick={() => onDigit(d)}>
            {d}
          </button>
        ))}
        <div />
        <button type="button" className="btn btn-secondary" style={{ width: '100%', minHeight: 64, fontSize: 22 }} onClick={() => onDigit('0')}>
          0
        </button>
        <button type="button" className="btn btn-secondary" style={{ width: '100%', minHeight: 64, fontSize: 18 }} onClick={onBackspace}>
          ⌫
        </button>
      </div>

      {stage === 'locked' && (
        <button
          type="button"
          onClick={onForgotPin}
          style={{ background: 'none', border: 'none', color: 'var(--color-ink-soft)', fontSize: 13, marginTop: 20, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Forgot PIN?
        </button>
      )}
    </main>
  )
}
