import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScaleButtons } from '../components/ScaleButtons'
import { saveQuestionnaire } from '../db/repositories/questionnaire'
import { useTranslation } from '../i18n/I18nContext'
import { Icon } from '../components/Icon'

export default function QuestionnairePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { t, language } = useTranslation()

  const DIFFICULTY_OPTIONS = [
    { value: 0, label: t('common.none') },
    { value: 1, label: t('common.mild') },
    { value: 2, label: t('common.moderate') },
    { value: 3, label: t('common.severe') },
  ]

  // Pain buttons show words, not numbers — mapped onto the same 0-10 scale
  // riskScoring.ts expects, using integers only (pain_rest/etc. are smallint
  // columns in the Supabase mirror; a fractional value like 2.5 would fail
  // to sync even though local SQLite wouldn't complain).
  const PAIN_OPTIONS = [
    { value: 0, label: t('questionnaire.noPain') },
    { value: 2, label: t('common.mild') },
    { value: 5, label: t('common.moderate') },
    { value: 8, label: t('common.severe') },
    { value: 10, label: t('questionnaire.verySevere') },
  ]

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
        <div className="page-header-row">
          <div className="page-icon-badge" style={{ background: 'var(--color-success-tint)', color: 'var(--color-success)' }}>
            <Icon name="check-circle" size={22} />
          </div>
          <div className="page-header">
            <h1 className="page-title">{t('questionnaire.savedTitle')}</h1>
            <p className="page-subtitle">{t('questionnaire.savedSubtitle')}</p>
          </div>
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
      <div className="page-header-row">
        <div className="page-icon-badge"><Icon name="clipboard-list" size={22} /></div>
        <div className="page-header">
          <h1 className="page-title">{t('questionnaire.title')}</h1>
        </div>
      </div>

      <div className="section">
        <div className="section-label">{t('questionnaire.painSectionLabel')}</div>
        <ScaleButtons label={t('questionnaire.painAtRest')} options={PAIN_OPTIONS} value={painRest} onChange={setPainRest} />
        <ScaleButtons label={t('questionnaire.painWhileWalking')} options={PAIN_OPTIONS} value={painWalking} onChange={setPainWalking} />
        <ScaleButtons label={t('questionnaire.painWhileBending')} options={PAIN_OPTIONS} value={painBending} onChange={setPainBending} />
        <ScaleButtons label={t('questionnaire.painWhileClimbingStairs')} options={PAIN_OPTIONS} value={painStairs} onChange={setPainStairs} />
      </div>

      <div className="section">
        <div className="section-label">{t('questionnaire.otherSymptomsLabel')}</div>
        <ScaleButtons label={t('questionnaire.morningStiffness')} options={DIFFICULTY_OPTIONS} value={morningStiffness} onChange={setMorningStiffness} />
        <ScaleButtons label={t('questionnaire.swelling')} options={DIFFICULTY_OPTIONS} value={swelling} onChange={setSwelling} />
        <ScaleButtons label={t('questionnaire.walkingDifficulty')} options={DIFFICULTY_OPTIONS} value={walkingDifficulty} onChange={setWalkingDifficulty} />
        <ScaleButtons label={t('questionnaire.stairClimbingDifficulty')} options={DIFFICULTY_OPTIONS} value={stairClimbingDifficulty} onChange={setStairClimbingDifficulty} />
        <ScaleButtons label={t('questionnaire.standFromChairDifficulty')} options={DIFFICULTY_OPTIONS} value={standFromChairDifficulty} onChange={setStandFromChairDifficulty} />
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
