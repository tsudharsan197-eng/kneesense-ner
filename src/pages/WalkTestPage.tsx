import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScaleButtons } from '../components/ScaleButtons'
import { saveWalkTest } from '../db/repositories/walkTest'
import { useTranslation } from '../i18n/I18nContext'
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

  const startTimeRef = useRef<string>('')
  const startPerfRef = useRef(0)
  const endTimeRef = useRef<string>('')
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current) }, [])

  function onStartWalk() {
    startTimeRef.current = new Date().toISOString()
    startPerfRef.current = performance.now()
    setSteps(0)
    setPauses(0)
    setElapsedS(0)
    setPhase('walking')
    tickRef.current = setInterval(() => {
      setElapsedS((performance.now() - startPerfRef.current) / 1000)
    }, 200)
  }

  function onStopWalk() {
    if (tickRef.current) clearInterval(tickRef.current)
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
        <div className="page-header">
          <h1 className="page-title">{t('walkTest.title')}</h1>
          <p className="page-subtitle">{t('walkTest.setupSubtitle')}</p>
        </div>
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
    return (
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">{t('walkTest.walkingTitle')}</h1>
        </div>
        <p className="timer-display">{elapsedS.toFixed(1)}s</p>

        <div className="tap-grid">
          <button type="button" onClick={() => setSteps((s) => s + 1)} className="tap-btn tap-btn-accent">
            {t('walkTest.step')}<span className="tap-count">{steps}</span>
          </button>
          <button type="button" onClick={() => setPauses((p) => p + 1)} className="tap-btn">
            {t('walkTest.pause')}<span className="tap-count">{pauses}</span>
          </button>
        </div>

        <button type="button" onClick={onStopWalk} className="btn btn-danger btn-lg btn-block">
          {t('walkTest.stopWalk')}
        </button>
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
      <div className="page-header">
        <h1 className="page-title">{t('walkTest.savedTitle')}</h1>
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
