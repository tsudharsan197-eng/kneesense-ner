import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../client';
import { queueForSync } from '../outbox';
import type { Language, QuestionnaireResponse } from '../../types/models';

export interface QuestionnaireInput {
  sessionId: string;
  painRest: number; // 0-10
  painWalking: number; // 0-10
  painBending: number; // 0-10
  painStairs: number; // 0-10
  morningStiffness: number; // 0-3
  swelling: number; // 0-3
  walkingDifficulty: number; // 0-3
  stairClimbingDifficulty: number; // 0-3
  standFromChairDifficulty: number; // 0-3
  previousInjuryDetail?: string;
  languageUsed?: Language;
}

export async function saveQuestionnaire(input: QuestionnaireInput): Promise<QuestionnaireResponse> {
  const db = getDb();
  const painScoreAvg =
    (input.painRest + input.painWalking + input.painBending + input.painStairs) / 4;

  const response: QuestionnaireResponse = {
    id: uuidv4(),
    session_id: input.sessionId,
    pain_rest: input.painRest,
    pain_walking: input.painWalking,
    pain_bending: input.painBending,
    pain_stairs: input.painStairs,
    pain_score_avg: Math.round(painScoreAvg * 10) / 10,
    morning_stiffness: input.morningStiffness,
    swelling: input.swelling,
    walking_difficulty: input.walkingDifficulty,
    stair_climbing_difficulty: input.stairClimbingDifficulty,
    stand_from_chair_difficulty: input.standFromChairDifficulty,
    previous_injury_detail: input.previousInjuryDetail,
    language_used: input.languageUsed ?? 'en',
    created_at: new Date().toISOString(),
    synced: 0,
  };

  await db.run(
    `INSERT INTO questionnaire_responses (
       id, session_id, pain_rest, pain_walking, pain_bending, pain_stairs, pain_score_avg,
       morning_stiffness, swelling, walking_difficulty, stair_climbing_difficulty,
       stand_from_chair_difficulty, previous_injury_detail, language_used, created_at, synced
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      response.id,
      response.session_id,
      response.pain_rest ?? null,
      response.pain_walking ?? null,
      response.pain_bending ?? null,
      response.pain_stairs ?? null,
      response.pain_score_avg ?? null,
      response.morning_stiffness ?? null,
      response.swelling ?? null,
      response.walking_difficulty ?? null,
      response.stair_climbing_difficulty ?? null,
      response.stand_from_chair_difficulty ?? null,
      response.previous_injury_detail ?? null,
      response.language_used ?? null,
      response.created_at,
    ],
  );

  await queueForSync(
    'questionnaire_responses',
    response.id,
    'insert',
    response as unknown as Record<string, unknown>,
  );
  return response;
}

export async function getQuestionnaireForSession(sessionId: string): Promise<QuestionnaireResponse | null> {
  const db = getDb();
  const res = await db.query('SELECT * FROM questionnaire_responses WHERE session_id = ? LIMIT 1', [sessionId]);
  return (res.values?.[0] as unknown as QuestionnaireResponse) ?? null;
}
