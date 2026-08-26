import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, type DashboardStats } from '../db/repositories/dashboard'
import { BarChart } from '../components/BarChart'
import type { RiskCategory } from '../types/models'

const RISK_FILL: Record<RiskCategory, string> = {
  low: 'bar-fill-low',
  moderate: 'bar-fill-moderate',
  high: 'bar-fill-high',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    getDashboardStats().then(setStats)
  }, [])

  if (!stats) {
    return (
      <main className="page">
        <p className="page-subtitle">Loading…</p>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Computed from data on this device — works fully offline, no sync required.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.totalPatients}</span>
          <span className="stat-label">Total patients</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalSessions}</span>
          <span className="stat-label">Screenings completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.sessionsLast7Days}</span>
          <span className="stat-label">Screenings, last 7 days</span>
        </div>
      </div>

      <div className="section">
        <div className="section-label">Risk category distribution</div>
        <BarChart
          rows={stats.riskDistribution.map((r) => ({
            label: r.category,
            count: r.count,
            fillClass: RISK_FILL[r.category],
          }))}
        />
      </div>

      {stats.ageGroupDistribution.length > 0 && (
        <div className="section">
          <div className="section-label">Patients by age group</div>
          <BarChart rows={stats.ageGroupDistribution.map((r) => ({ label: r.ageGroup, count: r.count }))} />
        </div>
      )}

      {stats.locationDistribution.length > 0 && (
        <div className="section">
          <div className="section-label">Patients by location</div>
          <BarChart rows={stats.locationDistribution.map((r) => ({ label: r.location, count: r.count }))} />
        </div>
      )}

      <div className="section">
        <div className="section-label">Recent screenings</div>
        <div className="list">
          {stats.recentSessions.length === 0 && <p className="page-subtitle">No screenings yet.</p>}
          {stats.recentSessions.map((s) => (
            <div key={s.sessionId} className="list-row">
              <div className="list-row-main">
                <span className="list-row-title">{s.patientCode}</span>
                <span className="list-row-meta">{new Date(s.sessionDate).toLocaleDateString()}</span>
              </div>
              {s.riskCategory ? (
                <span className={`badge ${s.riskCategory === 'low' ? 'badge-synced' : 'badge-pending'}`}>
                  {s.riskCategory}
                </span>
              ) : (
                <span className="badge badge-pending">in progress</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => navigate('/')} className="btn btn-secondary btn-lg btn-block">
        ← Back to patients
      </button>
    </main>
  )
}
