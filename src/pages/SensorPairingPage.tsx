import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { calibrate, connect, isConnected } from '../lib/bleConnection'
import { useTranslation } from '../i18n/I18nContext'

type Status = 'idle' | 'connecting' | 'connected' | 'calibrating' | 'calibrated' | 'error'

export default function SensorPairingPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>(isConnected() ? 'connected' : 'idle')
  const [error, setError] = useState<string | null>(null)

  async function onConnect() {
    setStatus('connecting')
    setError(null)
    try {
      await connect(() => setStatus('idle'))
      setStatus('connected')
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }

  async function onCalibrate() {
    setStatus('calibrating')
    setError(null)
    try {
      await calibrate()
      setStatus('calibrated')
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">{t('sensorPairing.title')}</h1>
        <p className="page-subtitle">{t('sensorPairing.subtitle')}</p>
      </div>

      <p className="card-info">{t('sensorPairing.skipNotice')}</p>

      <div className="section">
        <h2 className="section-title">{t('sensorPairing.step1')}</h2>
        <button
          type="button"
          onClick={onConnect}
          disabled={status === 'connecting' || status === 'connected' || status === 'calibrating' || status === 'calibrated'}
          className="btn btn-primary btn-lg btn-block"
        >
          {status === 'connecting'
            ? t('sensorPairing.connecting')
            : status === 'idle' || status === 'error'
              ? t('sensorPairing.connect')
              : t('sensorPairing.connected')}
        </button>
      </div>

      <div className="section">
        <h2 className="section-title">{t('sensorPairing.step2')}</h2>
        <p className="page-subtitle">{t('sensorPairing.calibrateSubtitle')}</p>
        <button
          type="button"
          onClick={onCalibrate}
          disabled={status !== 'connected' && status !== 'calibrated'}
          className="btn btn-primary btn-lg btn-block"
        >
          {status === 'calibrating' ? t('sensorPairing.calibrating') : status === 'calibrated' ? t('sensorPairing.calibrated') : t('sensorPairing.calibrate')}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{error}</p>}

      <button
        type="button"
        onClick={() => navigate(`/session/${sessionId}/exercise`)}
        className="btn btn-secondary btn-lg btn-block"
      >
        {status === 'calibrated' ? t('sensorPairing.continue') : t('sensorPairing.skip')}
      </button>
    </main>
  )
}
