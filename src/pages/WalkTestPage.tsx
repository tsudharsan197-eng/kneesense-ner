import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScaleButtons } from '../components/ScaleButtons'
import { saveWalkTest } from '../db/repositories/walkTest'
import { isConnected as isSensorConnected, onDisconnect, subscribeBleImuSamples } from '../lib/bleConnection'
import { StepCounter, STEP_CALIBRATION_SECONDS } from '../lib/stepCounter'
import { useTranslation } from '../i18n/I18nContext'
import { Icon } from '../components/Icon'
import { ErrorModal } from '../components/ErrorModal'
import type { WalkTestMetrics } from '../types/models'

type Phase = 'setup' | 'walking' | 'rating' | 'done'

export default function WalkTestPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const DISTANCE_OPTIONS = [
    { value: 6, label: t('walkTest.distance6m') },
    { value: 10, label: t('walkTest.distance10m') },
  ]
  const DIFFICULTY_LABELS = [t('common.none'), t('common.mild'), t('common.moderate'), t('common.severe')]

  const [phase, setPhase] = useState<Phase>('setup')
  const [distanceM, setDistanceM] = useState(6)
  const [elapsedS, setElapsedS] = useState(0)
  const [steps, setSteps] = useState(0)
  const [pauses, setPauses] = useState(0)
  const [assistanceNeeded, setAssistanceNeeded] = useState<boolean | null>(null)
  const [gaitIrregularity, setGaitIrregularity] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<WalkTestMetrics | null>(null)
  const [sensorErrorModal, setSensorErrorModal] = useState<{ title: string; message: string } | null>(null)

  // Live auto step-detection state — only populated when a real sensor is
  // connected; the manual tap counter above still works standalone otherwise.
  const [stepCounterPhase, setStepCounterPhase] = useState<'CALIBRATING' | 'COUNTING' | null>(null)
  const [calibElapsedS, setCalibElapsedS] = useState(0)

  const startTimeRef = useRef<string>('')
  const startPerfRef = useRef(0)
  const endTimeRef = useRef<string>('')
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stepCounterRef = useRef<StepCounter | null>(null)
  const unsubscribeBleRef = useRef<(() => void) | null>(null)
  const usingAutoStepsRef = useRef(false)

  function stopBleStepDetection() {
    unsubscribeBleRef.current?.()
    unsubscribeBleRef.current = null
    stepCounterRef.current = null
  }

  useEffect(() => {
    const unsubscribe = onDisconnect(() => {
      if (!usingAutoStepsRef.current) return
      stopBleStepDetection()
      usingAutoStepsRef.current = false
      if (tickRef.current) clearInterval(tickRef.current)
      setPhase('setup')
      setSensorErrorModal({ title: t('sensorError.genericTitle'), message: t('sensorError.disconnectedMidCaptureMessage') })
    })
    return () => {
      unsubscribe()
      if (tickRef.current) clearInterval(tickRef.current)
      stopBleStepDetection()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onStartWalk() {
    startTimeRef.current = new Date().toISOString()
    startPerfRef.current = performance.now()
    setSteps(0)
    setPauses(0)
    setElapsedS(0)
    setStepCounterPhase(null)
    setCalibElapsedS(0)
    setPhase('walking')
    tickRef.current = setInterval(() => {
      setElapsedS((performance.now() - startPerfRef.current) / 1000)
    }, 200)

    if (isSensorConnected()) {
      usingAutoStepsRef.current = true
      const counter = new StepCounter()
      stepCounterRef.current = counter
      unsubscribeBleRef.current = subscribeBleImuSamples(
        (sample) => {
          counter.update(sample.angleDeg, sample.accelMag, sample.t)
          setSteps(counter.stepCount)
          setStepCounterPhase(counter.phase)
          if (counter.phase === 'CALIBRATING' && counter.phaseStartS !== null) {
            setCalibElapsedS(sample.t - counter.phaseStartS)
          }
        },
        () => {
          usingAutoStepsRef.current = false
          stopBleStepDetection()
          if (tickRef.current) clearInterval(tickRef.current)
          setPhase('setup')
          setSensorErrorModal({ title: t('sensorError.genericTitle'), message: t('sensorError.startFailedMessage') })
        },
      )
    } else {
      usingAutoStepsRef.current = false
    }
  }

  function onStopWalk() {
    if (tickRef.current) clearInterval(tickRef.current)
    stopBleStepDetection()
    usingAutoStepsRef.current = false
    endTimeRef.current = new Date().toISOString()
    setElapsedS((performance.now() - startPerfRef.current) / 1000)
    setPhase('rating')
  }

  async function onSave() {
    if (!sessionId || assistanceNeeded === null || gaitIrregularity === null) return
    setSaving(true)
    try {
      const { metrics } = await saveWalkTest({
        sessionId,
        startTime: startTimeRef.current,
        endTime: endTimeRef.current,
        distanceM,
        timeS: elapsedS,
        steps,
        pauseCount: pauses,
        assistanceNeeded,
        gaitIrregularity,
      })
      setResult(metrics)
      setPhase('done')
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'setup') {
    return (
      <main className="page">
        <div className="page-header-row">
          <div className="page-icon-badge"><Icon name="footprints" size={22} /></div>
          <div className="page-header">
            <h1 className="page-title">{t('walkTest.title')}</h1>
            <p className="page-subtitle">{t('walkTest.setupSubtitle')}</p>
          </div>
        </div>
        {isSensorConnected() && <p className="card-info">{t('kneeExtension.sensorConnected')}</p>}
        <div className="choice-grid">
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`choice-btn${distanceM === opt.value ? ' is-selected' : ''}`}
              onClick={() => setDistanceM(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onStartWalk} className="btn btn-primary btn-lg btn-block">
          {t('walkTest.startWalk')}
        </button>
      </main>
    )
  }

  if (phase === 'walking') {
    const autoMode = usingAutoStepsRef.current
    return (
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">{t('walkTest.walkingTitle')}</h1>
        </div>
        <p className="timer-display">{elapsedS.toFixed(1)}s</p>

        {autoMode && stepCounterPhase === 'CALIBRATING' && (
          <p className="card-info">
            {t('walkTest.calibratingGait', { elapsed: calibElapsedS.toFixed(1), total: STEP_CALIBRATION_SECONDS.toFixed(0) })}
          </p>
        )}

        <div className="tap-grid">
          {autoMode ? (
            <div className="tap-btn tap-btn-accent">
              {t('walkTest.autoStepsLabel')}<span className="tap-count">{steps}</span>
            </div>
          ) : (
            <button type="button" onClick={() => setSteps((s) => s + 1)} className="tap-btn tap-btn-accent">
              {t('walkTest.step')}<span className="tap-count">{steps}</span>
            </button>
          )}
          <button type="button" onClick={() => setPauses((p) => p + 1)} className="tap-btn">
            {t('walkTest.pause')}<span className="tap-count">{pauses}</span>
          </button>
        </div>

        <button type="button" onClick={onStopWalk} className="btn btn-danger btn-lg btn-block">
          {t('walkTest.stopWalk')}
        </button>

        {sensorErrorModal && (
          <ErrorModal
            title={sensorErrorModal.title}
            message={sensorErrorModal.message}
            primaryLabel={t('sensorError.goToPairing')}
            onPrimary={() => navigate(`/session/${sessionId}/sensor-pairing`)}
            secondaryLabel={t('sensorError.dismiss')}
            onSecondary={() => setSensorErrorModal(null)}
          />
        )}
      </main>
    )
  }

  if (phase === 'rating') {
    return (
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">{t('walkTest.finishTitle')}</h1>
          <p className="page-subtitle">{t('walkTest.finishSubtitle', { time: elapsedS.toFixed(1), steps, pauses })}</p>
        </div>

        <div className="section">
          <h2 className="section-title">{t('walkTest.assistanceQuestion')}</h2>
          <div className="choice-grid cols-2">
            <button
              type="button"
              className={`choice-btn${assistanceNeeded === true ? ' is-selected' : ''}`}
              onClick={() => setAssistanceNeeded(true)}
            >
              {t('common.yes')}
            </button>
            <button
              type="button"
              className={`choice-btn${assistanceNeeded === false ? ' is-selected' : ''}`}
              onClick={() => setAssistanceNeeded(false)}
            >
              {t('common.no')}
            </button>
          </div>
        </div>

        <ScaleButtons
          label={t('walkTest.gaitIrregularity')}
          min={0}
          max={3}
          value={gaitIrregularity}
          onChange={setGaitIrregularity}
          labels={DIFFICULTY_LABELS}
        />

        <button
          type="button"
          disabled={assistanceNeeded === null || gaitIrregularity === null || saving}
          onClick={onSave}
          className="btn btn-primary btn-lg btn-block"
        >
          {saving ? t('walkTest.saving') : t('walkTest.saveButton')}
        </button>
      </main>
    )
  }

  // done
  return (
    <main className="page">
      <div className="page-header-row">
        <div className="page-icon-badge" style={{ background: 'var(--color-success-tint)', color: 'var(--color-success)' }}>
          <Icon name="check-circle" size={22} />
        </div>
        <div className="page-header">
          <h1 className="page-title">{t('walkTest.savedTitle')}</h1>
        </div>
      </div>
      {result && (
        <table className="data-table">
          <tbody>
            <tr><td>{t('walkTest.distanceLabel')}</td><td>{result.distance_m} m</td></tr>
            <tr><td>{t('walkTest.timeLabel')}</td><td>{result.time_s} s</td></tr>
            <tr><td>{t('walkTest.stepsLabel')}</td><td>{result.steps}</td></tr>
            <tr><td>{t('walkTest.speedLabel')}</td><td>{result.speed_mps} m/s</td></tr>
            <tr><td>{t('walkTest.cadenceLabel')}</td><td>{result.cadence_spm} steps/min</td></tr>
            <tr><td>{t('walkTest.pausesLabel')}</td><td>{result.pause_count}</td></tr>
          </tbody>
        </table>
      )}
      <button
        type="button"
        onClick={() => navigate(`/session/${sessionId}/results`)}
        className="btn btn-primary btn-lg btn-block"
      >
        {t('walkTest.continueToResults')}
      </button>
    </main>
  )
}
