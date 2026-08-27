import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveExerciseCapture } from '../db/repositories/exerciseCaptures'
import { saveCameraFeatures } from '../db/repositories/cameraFeatures'
import { getSession } from '../db/repositories/sessions'
import { SimulatedKneeExtensionSource, type SensorSource } from '../lib/sensorSource'
import { createBleSensorSource, isConnected as isSensorConnected } from '../lib/bleConnection'
import { PoseCameraSource, type CameraAngleSample, type KneeSide } from '../lib/cameraSource'
import { useTranslation } from '../i18n/I18nContext'
import { Icon } from '../components/Icon'
import type { AngleSample } from '../lib/motionAnalysis'
import type { CameraFeatures, ExerciseCapture } from '../types/models'

export default function ExerciseCapturePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [capturing, setCapturing] = useState(false)
  const [sampleCount, setSampleCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ExerciseCapture | null>(null)
  const [cameraFeatures, setCameraFeatures] = useState<CameraFeatures | null>(null)

  const [useCamera, setUseCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const sourceRef = useRef<SensorSource | null>(null)
  const samplesRef = useRef<AngleSample[]>([])
  const startTimeRef = useRef<string>('')

  const cameraSourceRef = useRef<PoseCameraSource | null>(null)
  const cameraSamplesRef = useRef<CameraAngleSample[]>([])

  function onStart() {
    samplesRef.current = []
    setSampleCount(0)
    setResult(null)
    setCameraFeatures(null)
    setCameraError(null)
    startTimeRef.current = new Date().toISOString()

    const source = isSensorConnected() ? createBleSensorSource() : new SimulatedKneeExtensionSource()
    sourceRef.current = source
    source.start((sample) => {
      samplesRef.current.push(sample)
      setSampleCount(samplesRef.current.length)
    })

    if (useCamera && videoRef.current) {
      cameraSamplesRef.current = []
      const cameraSource = new PoseCameraSource()
      cameraSourceRef.current = cameraSource
      getSession(sessionId!)
        .then((session) => {
          const side: KneeSide = session?.affected_knee === 'right' ? 'right' : 'left'
          return cameraSource.start(videoRef.current!, side, (sample) => {
            cameraSamplesRef.current.push(sample)
          })
        })
        .catch((err) => setCameraError(String(err)))
    }

    setCapturing(true)
  }

  async function onStop() {
    sourceRef.current?.stop()
    sourceRef.current = null
    cameraSourceRef.current?.stop()
    cameraSourceRef.current = null
    setCapturing(false)

    if (!sessionId || samplesRef.current.length === 0) return
    setSaving(true)
    try {
      const capture = await saveExerciseCapture({
        sessionId,
        exerciseType: 'knee_extension',
        startTime: startTimeRef.current,
        endTime: new Date().toISOString(),
        samples: samplesRef.current,
      })
      setResult(capture)

      if (useCamera && cameraSamplesRef.current.length > 0 && capture.rom_deg !== undefined) {
        const camFeatures = await saveCameraFeatures({
          exerciseCaptureId: capture.id,
          imuRomDeg: capture.rom_deg,
          cameraSamples: cameraSamplesRef.current,
        })
        setCameraFeatures(camFeatures)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <div className="page-header-row">
        <div className="page-icon-badge"><Icon name="activity" size={22} /></div>
        <div className="page-header">
          <h1 className="page-title">{t('kneeExtension.title')}</h1>
          <p className="page-subtitle">{t('kneeExtension.subtitle')}</p>
        </div>
      </div>

      <p className="card-info">
        {isSensorConnected() ? t('kneeExtension.sensorConnected') : t('kneeExtension.sensorSimulated')}
      </p>

      {!capturing && !result && (
        <div className="section">
          <button
            type="button"
            onClick={() => setUseCamera((v) => !v)}
            className={`choice-btn${useCamera ? ' is-selected' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Icon name="camera" size={18} />
            {useCamera ? t('kneeExtension.cameraEnabled') : t('kneeExtension.enableCamera')}
          </button>
          <button type="button" onClick={onStart} className="btn btn-primary btn-lg btn-block">
            {t('kneeExtension.startCapture')}
          </button>
        </div>
      )}

      {useCamera && (
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000', display: capturing ? 'block' : 'none' }}
        />
      )}

      {cameraError && <p style={{ color: 'var(--color-danger)', fontSize: 13 }}>{t('kneeExtension.cameraError', { message: cameraError })}</p>}

      {capturing && (
        <div className="section">
          <p className="page-subtitle">{t('kneeExtension.capturing', { count: sampleCount })}</p>
          <button type="button" onClick={onStop} className="btn btn-danger btn-lg btn-block">
            {t('kneeExtension.stopCapture')}
          </button>
        </div>
      )}

      {saving && <p className="page-subtitle">{t('kneeExtension.analyzing')}</p>}

      {result && (
        <div className="section">
          <h2 className="section-title">{t('kneeExtension.result')}</h2>
          <table className="data-table">
            <tbody>
              <tr><td>{t('kneeExtension.minAngle')}</td><td>{result.min_angle_deg}°</td></tr>
              <tr><td>{t('kneeExtension.maxAngle')}</td><td>{result.max_angle_deg}°</td></tr>
              <tr><td>{t('kneeExtension.rangeOfMotion')}</td><td>{result.rom_deg}°</td></tr>
              <tr><td>{t('kneeExtension.smoothness')}</td><td>{result.smoothness}</td></tr>
              <tr><td>{t('kneeExtension.repsCounted')}</td><td>{result.rep_count}</td></tr>
            </tbody>
          </table>

          {cameraFeatures && (
            <>
              <h2 className="section-title">{t('kneeExtension.cameraCrossCheck')}</h2>
              <table className="data-table">
                <tbody>
                  <tr><td>{t('kneeExtension.cameraRom')}</td><td>{cameraFeatures.camera_rom}°</td></tr>
                  <tr><td>{t('kneeExtension.imuCameraDiff')}</td><td>{cameraFeatures.imu_camera_diff}°</td></tr>
                  <tr><td>{t('kneeExtension.cameraConfidence')}</td><td>{cameraFeatures.confidence_avg}</td></tr>
                </tbody>
              </table>
              {cameraFeatures.agreement_status === 'mismatch' && (
                <p className="card-muted" style={{ background: 'var(--color-danger-tint)', color: 'var(--color-danger)' }}>
                  {t('kneeExtension.mismatchWarning')}
                </p>
              )}
              {cameraFeatures.agreement_status === 'check_filtering' && (
                <p className="card-muted" style={{ background: 'var(--color-warning-tint)', color: 'var(--color-warning)' }}>
                  {t('kneeExtension.checkFilteringWarning')}
                </p>
              )}
              {(cameraFeatures.confidence_avg ?? 0) < 0.5 && (
                <p className="card-muted">{t('kneeExtension.lowConfidenceNotice')}</p>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => navigate(`/session/${sessionId}/sit-to-stand`)}
            className="btn btn-primary btn-lg btn-block"
          >
            {t('kneeExtension.continueToSitToStand')}
          </button>
        </div>
      )}
    </main>
  )
}
