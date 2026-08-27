import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createSession } from '../db/repositories/sessions'
import { useTranslation } from '../i18n/I18nContext'
import { Icon } from '../components/Icon'
import type { AffectedKnee } from '../types/models'

export default function NewSessionPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [affectedKnee, setAffectedKnee] = useState<AffectedKnee | null>(null)
  const [previousInjury, setPreviousInjury] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const KNEE_OPTIONS: { value: AffectedKnee; label: string }[] = [
    { value: 'left', label: t('newSession.leftKnee') },
    { value: 'right', label: t('newSession.rightKnee') },
    { value: 'both', label: t('newSession.bothKnees') },
  ]

  async function onContinue() {
    if (!patientId || !affectedKnee || previousInjury === null) return
    setSaving(true)
    try {
      const session = await createSession({ patientId, affectedKnee, previousInjury })
      navigate(`/session/${session.id}/questionnaire`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <div className="page-header-row">
        <div className="page-icon-badge"><Icon name="activity" size={22} /></div>
        <div className="page-header">
          <h1 className="page-title">{t('newSession.title')}</h1>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">{t('newSession.whichKnee')}</h2>
        <div className="choice-grid">
          {KNEE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`choice-btn${affectedKnee === opt.value ? ' is-selected' : ''}`}
              onClick={() => setAffectedKnee(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">{t('newSession.previousInjury')}</h2>
        <div className="choice-grid cols-2">
          <button
            type="button"
            className={`choice-btn${previousInjury === true ? ' is-selected' : ''}`}
            onClick={() => setPreviousInjury(true)}
          >
            {t('common.yes')}
          </button>
          <button
            type="button"
            className={`choice-btn${previousInjury === false ? ' is-selected' : ''}`}
            onClick={() => setPreviousInjury(false)}
          >
            {t('common.no')}
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!affectedKnee || previousInjury === null || saving}
        onClick={onContinue}
        className="btn btn-primary btn-lg btn-block"
      >
        {saving ? t('newSession.starting') : t('newSession.continueToQuestionnaire')}
      </button>
    </main>
  )
}
