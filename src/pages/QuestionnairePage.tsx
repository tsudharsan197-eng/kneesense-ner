import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScaleButtons } from '../components/ScaleButtons'
import { saveQuestionnaire } from '../db/repositories/questionnaire'
import { useTranslation } from '../i18n/I18nContext'

export default function QuestionnairePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t, language } = useTranslation()

  const DIFFICULTY_LABELS = [t('common.none'), t('common.mild'), t('common.moderate'), t('common.severe')]

  const [painRest, setPainRest] = useState<number | null>(null)
  const [painWalking, setPainWalking] = useState<number | null>(null)
  const [painBending, setPainBending] = useState<number | null>(null)
  const [painStairs, setPainStairs] = useState<number | null>(null)
  const [morningStiffness, setMorningStiffness] = useState<number | null>(null)
  const [swelling, setSwelling] = useState<number | null>(null)
  const [walkingDifficulty, setWalkingDifficulty] = useState<number | null>(null)
  const [stairClimbingDifficulty, setStairClimbingDifficulty] = useState<number | null>(null)
  const [standFromChairDifficulty, setStandFromChairDifficulty] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const allAnswered = [
    painRest, painWalking, painBending, painStairs,
    morningStiffness, swelling, walkingDifficulty, stairClimbingDifficulty, standFromChairDifficulty,
  ].every((v) => v !== null)

  async function onSubmit() {
    if (!sessionId || !allAnswered) return
    setSaving(true)
    try {
      await saveQuestionnaire({
        sessionId,
        painRest: painRest!,
        painWalking: painWalking!,
        painBending: painBending!,
        painStairs: painStairs!,
        morningStiffness: morningStiffness!,
        swelling: swelling!,
        walkingDifficulty: walkingDifficulty!,
        stairClimbingDifficulty: stairClimbingDifficulty!,
        standFromChairDifficulty: standFromChairDifficulty!,
        languageUsed: language,
      })
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">{t('questionnaire.savedTitle')}</h1>
          <p className="page-subtitle">{t('questionnaire.savedSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/session/${sessionId}/sensor-pairing`)}
          className="btn btn-primary btn-lg btn-block"
        >
          {t('questionnaire.continueToSensorSetup')}
        </button>
      </main>
    )
  }

  return (
    <main className="page" style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      <div className="page-header">
        <h1 className="page-title">{t('questionnaire.title')}</h1>
      </div>

      <div className="section">
        <div className="section-label">{t('questionnaire.painSectionLabel')}</div>
        <ScaleButtons label={t('questionnaire.painAtRest')} min={0} max={10} value={painRest} onChange={setPainRest} />
        <ScaleButtons label={t('questionnaire.painWhileWalking')} min={0} max={10} value={painWalking} onChange={setPainWalking} />
        <ScaleButtons label={t('questionnaire.painWhileBending')} min={0} max={10} value={painBending} onChange={setPainBending} />
        <ScaleButtons label={t('questionnaire.painWhileClimbingStairs')} min={0} max={10} value={painStairs} onChange={setPainStairs} />
      </div>

      <div className="section">
        <div className="section-label">{t('questionnaire.otherSymptomsLabel')}</div>
        <ScaleButtons label={t('questionnaire.morningStiffness')} min={0} max={3} value={morningStiffness} onChange={setMorningStiffness} labels={DIFFICULTY_LABELS} />
        <ScaleButtons label={t('questionnaire.swelling')} min={0} max={3} value={swelling} onChange={setSwelling} labels={DIFFICULTY_LABELS} />
        <ScaleButtons label={t('questionnaire.walkingDifficulty')} min={0} max={3} value={walkingDifficulty} onChange={setWalkingDifficulty} labels={DIFFICULTY_LABELS} />
        <ScaleButtons label={t('questionnaire.stairClimbingDifficulty')} min={0} max={3} value={stairClimbingDifficulty} onChange={setStairClimbingDifficulty} labels={DIFFICULTY_LABELS} />
        <ScaleButtons label={t('questionnaire.standFromChairDifficulty')} min={0} max={3} value={standFromChairDifficulty} onChange={setStandFromChairDifficulty} labels={DIFFICULTY_LABELS} />
      </div>

      <button
        type="button"
        disabled={!allAnswered || saving}
        onClick={onSubmit}
        className="btn btn-primary btn-lg btn-block"
        style={{ position: 'sticky', bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      >
        {saving ? t('questionnaire.saving') : t('questionnaire.saveButton')}
      </button>
    </main>
  )
}
