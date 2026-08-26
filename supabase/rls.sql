-- =========================================================
-- Row Level Security for the KneeSense NER Supabase mirror.
--
-- NOT applied or tested against a live project — write carefully reviewed,
-- but there is no Supabase project connected in this environment to run
-- it against. Read the prerequisite below before applying this.
--
-- PREREQUISITE (not yet built): this policy model assumes each patient
-- row's `created_by` holds the Supabase Auth user id (`auth.uid()`) of the
-- health worker who registered them. Today, `created_by` is an optional
-- free-text field the app never actually populates — there is no Supabase
-- Auth login screen yet (the app's current "auth" is the local device PIN
-- lock in src/components/PinGate.tsx, which is unrelated to Supabase
-- Auth/identity and never leaves the device). Add a login flow and set
-- `created_by = auth.uid()` on patient creation before applying this —
-- otherwise every row's created_by is null and these policies deny access
-- to everything.
--
-- Model: a health worker sees/manages only the patients they registered,
-- and everything nested under them (sessions, questionnaire, captures,
-- risk scores, reports). If your deployment instead wants every worker at
-- a clinic to share visibility, swap the `created_by = auth.uid()::text`
-- checks below for an org/clinic-id column and check membership instead —
-- that's a schema change (add the column) as well as a policy change.
-- =========================================================

alter table patients                enable row level security;
alter table screening_sessions      enable row level security;
alter table questionnaire_responses enable row level security;
alter table exercise_captures       enable row level security;
alter table walk_test_metrics       enable row level security;
alter table camera_features         enable row level security;
alter table risk_scores             enable row level security;
alter table reports                 enable row level security;

create policy "own patients" on patients
  for all
  using (created_by = auth.uid()::text)
  with check (created_by = auth.uid()::text);

create policy "sessions for own patients" on screening_sessions
  for all
  using (exists (
    select 1 from patients p where p.id = screening_sessions.patient_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from patients p where p.id = screening_sessions.patient_id and p.created_by = auth.uid()::text
  ));

create policy "questionnaire for own patients" on questionnaire_responses
  for all
  using (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = questionnaire_responses.session_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = questionnaire_responses.session_id and p.created_by = auth.uid()::text
  ));

create policy "captures for own patients" on exercise_captures
  for all
  using (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = exercise_captures.session_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = exercise_captures.session_id and p.created_by = auth.uid()::text
  ));

create policy "walk metrics for own patients" on walk_test_metrics
  for all
  using (exists (
    select 1 from exercise_captures ec
    join screening_sessions s on s.id = ec.session_id
    join patients p on p.id = s.patient_id
    where ec.id = walk_test_metrics.exercise_capture_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from exercise_captures ec
    join screening_sessions s on s.id = ec.session_id
    join patients p on p.id = s.patient_id
    where ec.id = walk_test_metrics.exercise_capture_id and p.created_by = auth.uid()::text
  ));

create policy "camera features for own patients" on camera_features
  for all
  using (exists (
    select 1 from exercise_captures ec
    join screening_sessions s on s.id = ec.session_id
    join patients p on p.id = s.patient_id
    where ec.id = camera_features.exercise_capture_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from exercise_captures ec
    join screening_sessions s on s.id = ec.session_id
    join patients p on p.id = s.patient_id
    where ec.id = camera_features.exercise_capture_id and p.created_by = auth.uid()::text
  ));

create policy "risk scores for own patients" on risk_scores
  for all
  using (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = risk_scores.session_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = risk_scores.session_id and p.created_by = auth.uid()::text
  ));

create policy "reports for own patients" on reports
  for all
  using (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = reports.session_id and p.created_by = auth.uid()::text
  ))
  with check (exists (
    select 1 from screening_sessions s
    join patients p on p.id = s.patient_id
    where s.id = reports.session_id and p.created_by = auth.uid()::text
  ));
