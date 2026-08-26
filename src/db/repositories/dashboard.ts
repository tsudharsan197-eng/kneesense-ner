import { getDb } from '../client';
import type { RiskCategory } from '../../types/models';

export interface DashboardStats {
  totalPatients: number;
  totalSessions: number;
  sessionsLast7Days: number;
  riskDistribution: { category: RiskCategory; count: number }[];
  ageGroupDistribution: { ageGroup: string; count: number }[];
  locationDistribution: { location: string; count: number }[];
  recentSessions: {
    sessionId: string;
    patientCode: string;
    sessionDate: string;
    riskCategory: RiskCategory | null;
  }[];
}

const RISK_CATEGORIES: RiskCategory[] = ['low', 'moderate', 'high'];

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDb();

  const totalPatients = ((await db.query('SELECT COUNT(*) as n FROM patients')).values?.[0]?.n as number) ?? 0;
  const totalSessions = ((await db.query('SELECT COUNT(*) as n FROM screening_sessions')).values?.[0]?.n as number) ?? 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionsLast7Days =
    ((await db.query('SELECT COUNT(*) as n FROM screening_sessions WHERE created_at >= ?', [sevenDaysAgo])).values?.[0]
      ?.n as number) ?? 0;

  // Each Results-page visit inserts a fresh risk_scores row rather than
  // upserting (see riskScores.ts), so this dedupes to the most recent row
  // per session before counting — otherwise revisiting a result page would
  // double-count it here.
  const riskRes = await db.query(`
    SELECT risk_category, COUNT(*) as n FROM (
      SELECT session_id, risk_category,
             ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY computed_at DESC) as rn
      FROM risk_scores
    ) WHERE rn = 1
    GROUP BY risk_category
  `);
  const riskCounts = new Map<string, number>(
    (riskRes.values ?? []).map((r) => [r.risk_category as string, r.n as number]),
  );
  const riskDistribution = RISK_CATEGORIES.map((category) => ({ category, count: riskCounts.get(category) ?? 0 }));

  const ageRes = await db.query('SELECT age_group, COUNT(*) as n FROM patients GROUP BY age_group ORDER BY age_group');
  const ageGroupDistribution = (ageRes.values ?? []).map((r) => ({
    ageGroup: r.age_group as string,
    count: r.n as number,
  }));

  const locationRes = await db.query(
    `SELECT location, COUNT(*) as n FROM patients WHERE location IS NOT NULL AND TRIM(location) != ''
     GROUP BY location ORDER BY n DESC LIMIT 10`,
  );
  const locationDistribution = (locationRes.values ?? []).map((r) => ({
    location: r.location as string,
    count: r.n as number,
  }));

  const recentRes = await db.query(`
    SELECT s.id as session_id, s.session_date, p.patient_code,
           (SELECT risk_category FROM risk_scores rs WHERE rs.session_id = s.id ORDER BY rs.computed_at DESC LIMIT 1) as risk_category
    FROM screening_sessions s
    JOIN patients p ON p.id = s.patient_id
    ORDER BY s.created_at DESC
    LIMIT 10
  `);
  const recentSessions = (recentRes.values ?? []).map((r) => ({
    sessionId: r.session_id as string,
    patientCode: r.patient_code as string,
    sessionDate: r.session_date as string,
    riskCategory: (r.risk_category as RiskCategory | null) ?? null,
  }));

  return {
    totalPatients,
    totalSessions,
    sessionsLast7Days,
    riskDistribution,
    ageGroupDistribution,
    locationDistribution,
    recentSessions,
  };
}
