import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPatient, listPatients } from '../db/repositories/patients'
import { pendingOutboxCount } from '../db/outbox'
import { useTranslation } from '../i18n/I18nContext'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { Icon } from '../components/Icon'
import type { AgeGroup, Patient } from '../types/models'

const AGE_GROUPS: AgeGroup[] = ['18-30', '31-45', '46-60', '60+']

export default function PatientsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [patients, setPatients] = useState<Patient[]>([])
  const [pending, setPending] = useState(0)
  const [patientCode, setPatientCode] = useState('')
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('46-60')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setPatients(await listPatients())
    setPending(await pendingOutboxCount())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function onRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!patientCode.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createPatient({ patientCode: patientCode.trim(), ageGroup, location: location.trim() || undefined })
      setPatientCode('')
      setLocation('')
      await refresh()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <LanguageSwitcher />
        <div style={{ display: 'flex', gap: 14 }}>
          <button type="button" onClick={() => navigate('/dashboard')} className="nav-link">
            <Icon name="chart-bar" size={16} />
            Dashboard
          </button>
          <button type="button" onClick={() => navigate('/account')} className="nav-link">
            <Icon name="user" size={16} />
            Account
          </button>
        </div>
      </div>

      <div className="page-header-row">
        <div className="page-icon-badge"><Icon name="user-plus" size={22} /></div>
        <div className="page-header">
          <h1 className="page-title">{t('app.title')}</h1>
          <p className="page-subtitle">
            {pending > 0 ? t('patients.subtitlePending', { count: pending }) : t('patients.subtitleSynced')}
          </p>
        </div>
      </div>

      <form onSubmit={onRegister} className="section">
        <div className="field">
          <label className="field-label" htmlFor="patientCode">{t('patients.patientId')}</label>
          <input
            id="patientCode"
            className="input"
            value={patientCode}
            onChange={(e) => setPatientCode(e.target.value)}
            placeholder={t('patients.patientIdPlaceholder')}
            required
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ageGroup">{t('patients.ageGroup')}</label>
          <select
            id="ageGroup"
            className="select"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
          >
            {AGE_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="location">{t('patients.location')}</label>
          <input
            id="location"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: 14 }}>{error}</p>}

        <button type="submit" disabled={saving} className="btn btn-primary btn-lg btn-block">
          {saving ? t('patients.saving') : t('patients.registerButton')}
        </button>
      </form>

      <div className="section">
        <div className="section-label">{t('patients.registeredPatients', { count: patients.length })}</div>
        <div className="list">
          {patients.map((p) => (
            <div key={p.id} className="list-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div className="avatar-badge"><Icon name="user" size={18} /></div>
                <div className="list-row-main">
                  <span className="list-row-title">{p.patient_code}</span>
                  <span className="list-row-meta">{p.age_group}{p.location ? ` · ${p.location}` : ''}</span>
                  <span className={`badge ${p.synced ? 'badge-synced' : 'badge-pending'}`}>
                    {p.synced ? t('patients.synced') : t('patients.pendingSync')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/patients/${p.id}/new-session`)}
                className="btn btn-secondary btn-md"
              >
                {t('patients.startScreening')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
