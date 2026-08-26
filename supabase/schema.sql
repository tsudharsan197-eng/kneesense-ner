-- =========================================================
-- KneeSense NER — Supabase (Postgres) mirror of src/db/schema.sql
--
-- NOT applied to a live project in this session — no Supabase project is
-- connected. Written to mirror the local SQLite schema as closely as
-- possible (same table/column names, and the same "booleans as 0/1
-- integer" shape) because src/lib/sync.ts upserts the raw local row object
-- straight through PostgREST with no transform step — if the column types
-- here don't match what that JSON payload actually contains, upserts will
-- fail. Run this once against a real project, then supabase/rls.sql.
-- =========================================================

create table if not exists patients (
  id              text primary key,
  patient_code    text unique not null,
  age_group       text not null,
  sex             text,
  occupation      text,
  location        text,
  created_at      timestamptz not null,
  created_by      text,
  updated_at      timestamptz not null,
  synced          smallint not null default 0,
  synced_at       timestamptz
);

create table if not exists screening_sessions (
  id                  text primary key,
  patient_id          text not null references patients(id),
  session_date        timestamptz not null,
  affected_knee       text not null,
  previous_injury     smallint not null default 0,
  device_id           text,
  status              text not null default 'draft',
  created_at          timestamptz not null,
  updated_at          timestamptz not null,
  synced              smallint not null default 0,
  synced_at           timestamptz
);

create table if not exists questionnaire_responses (
  id                            text primary key,
  session_id                    text not null references screening_sessions(id),
  pain_rest                     smallint,
  pain_walking                  smallint,
  pain_bending                  smallint,
  pain_stairs                   smallint,
  pain_score_avg                double precision,
  morning_stiffness             smallint,
  swelling                      smallint,
  walking_difficulty            smallint,
  stair_climbing_difficulty     smallint,
  stand_from_chair_difficulty   smallint,
  previous_injury_detail        text,
  language_used                 text,
  created_at                    timestamptz not null,
  synced                        smallint not null default 0
);

create table if not exists exercise_captures (
  id              text primary key,
  session_id      text not null references screening_sessions(id),
  exercise_type   text not null,
  start_time      timestamptz not null,
  end_time        timestamptz,
  raw_data_path   text,
  min_angle_deg   double precision,
  max_angle_deg   double precision,
  rom_deg         double precision,
  smoothness      double precision,
  rep_count       smallint,
  created_at      timestamptz not null,
  synced          smallint not null default 0
);

create table if not exists walk_test_metrics (
  id                   text primary key,
  exercise_capture_id  text not null references exercise_captures(id),
  distance_m           double precision,
  time_s               double precision,
  steps                smallint,
  speed_mps            double precision,
  cadence_spm          double precision,
  pause_count          smallint,
  assistance_needed    smallint,
  gait_irregularity    double precision,
  synced               smallint not null default 0
);

create table if not exists camera_features (
  id                  text primary key,
  exercise_capture_id text not null references exercise_captures(id),
  camera_min_angle    double precision,
  camera_max_angle    double precision,
  camera_rom          double precision,
  confidence_avg      double precision,
  imu_camera_diff     double precision,
  agreement_status    text,
  synced              smallint not null default 0
);

create table if not exists risk_scores (
  id                      text primary key,
  session_id              text not null references screening_sessions(id),
  symptom_score           double precision,
  rom_score               double precision,
  movement_quality_score  double precision,
  mobility_score          double precision,
  agreement_score         double precision,
  weighted_total          double precision,
  risk_category           text,
  model_version           text,
  computed_at             timestamptz not null,
  synced                  smallint not null default 0
);

create table if not exists reports (
  id              text primary key,
  session_id      text not null references screening_sessions(id),
  generated_at    timestamptz not null,
  file_path       text not null,
  language        text,
  synced          smallint not null default 0
);

-- app_settings (PIN hash etc.) deliberately has no Supabase counterpart —
-- it's device-local access material, never queued through sync_outbox.
-- sync_outbox itself also has no Supabase counterpart — it's a purely
-- local bookkeeping table for the outbox pattern (src/lib/sync.ts).

create index if not exists idx_sessions_patient on screening_sessions(patient_id);
create index if not exists idx_captures_session on exercise_captures(session_id);
