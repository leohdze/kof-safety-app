-- ═══════════════════════════════════════════════════════════════════════════
-- KOF Safety App — Esquema completo de base de datos
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- NOTAS PREVIAS:
--  1. Si tienes una tabla task_evidence anterior (sin completion_id), elimínala:
--       drop table if exists task_evidence cascade;
--
--  2. En Supabase Dashboard → Storage → New Bucket:
--       Nombre: "evidencias"   Tipo: Public
--       Policy INSERT: allow authenticated users (check: auth.role() = 'authenticated')
--       Policy SELECT: public
--       Policy DELETE: check auth.uid()::text = (storage.foldername(name))[1]
--
--  3. Los roles de usuario (executive / field) deben setearse en app_metadata
--     usando la función de admin o via Dashboard → Auth → Users → Edit metadata.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helper: función updated_at ──────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ─── 1. PERFILES DE USUARIO ──────────────────────────────────────────────────
create table if not exists user_profiles (
  id           uuid references auth.users on delete cascade primary key,
  email        text not null,                         -- copia de auth.users.email
  full_name    text not null,
  role         text not null check (role in ('executive', 'field')),
  subrole      text check (subrole in ('TSD', 'Instructor', 'Regional', 'Corporativo')),
  region       text,
  uo           text[],                                -- array de UOs asignadas
  executive_id uuid references auth.users,            -- ejecutivo que supervisa al TSD
  is_active    boolean default true,
  last_seen    timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create trigger trg_user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

alter table user_profiles enable row level security;

create policy "Users read own profile"
  on user_profiles for select using (auth.uid() = id);

create policy "Executives read all profiles"
  on user_profiles for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

create policy "Executives manage profiles"
  on user_profiles for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

-- ─── 2. TAREAS ───────────────────────────────────────────────────────────────
create table if not exists tasks (
  id             uuid default gen_random_uuid() primary key,
  title          text not null,
  description    text,
  classification text not null check (classification in ('Operativa', 'Normativa')),
  priority       text not null check (priority in ('Bajo', 'Medio', 'Alto', 'Crítica')),
  periodicity    text not null check (periodicity in (
                   'Diario','Semanal','Quincenal','Cada 3 semanas',
                   'Mensual','Bimensual','Trimestral','Semestral','Anual')),
  date_type      text not null check (date_type in ('fixed', 'tsd_defined')),
  due_date       timestamptz,                         -- solo si date_type = 'fixed'
  tsd_date_deadline interval default '7 days',        -- plazo para que TSD ingrese fecha
  requires_vobo  boolean default false,
  evidence_types text[],                              -- ['photo','pdf','excel','word','video']
  material_url   text,
  created_by     uuid references auth.users not null,
  is_active      boolean default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create index if not exists idx_tasks_active       on tasks (is_active);
create index if not exists idx_tasks_classification on tasks (classification);
create index if not exists idx_tasks_priority     on tasks (priority);
create index if not exists idx_tasks_due_date     on tasks (due_date);
create index if not exists idx_tasks_created_by   on tasks (created_by);

alter table tasks enable row level security;

create policy "Executives manage tasks"
  on tasks for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

create policy "Field users read assigned tasks"
  on tasks for select using (
    exists (
      select 1 from task_assignments
      where task_assignments.task_id = tasks.id
        and task_assignments.user_id = auth.uid()
    )
  );

-- ─── 3. ASIGNACIONES ─────────────────────────────────────────────────────────
create table if not exists task_assignments (
  id                       uuid default gen_random_uuid() primary key,
  task_id                  uuid references tasks on delete cascade not null,
  user_id                  uuid references auth.users not null,
  region                   text,
  uo                       text,
  due_date                 timestamptz,               -- fecha límite para esta UO/usuario
  commitment_date          timestamptz,               -- fecha ingresada por el TSD
  commitment_date_deadline timestamptz,               -- límite para ingresar commitment_date
  status                   text default 'pending'
                           check (status in ('pending','completed','overdue','rejected')),
  attempt_count            integer default 0,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique(task_id, user_id)
);

create trigger trg_task_assignments_updated_at
  before update on task_assignments
  for each row execute function set_updated_at();

create index if not exists idx_task_assignments_task   on task_assignments (task_id);
create index if not exists idx_task_assignments_user   on task_assignments (user_id);
create index if not exists idx_task_assignments_status on task_assignments (status);

alter table task_assignments enable row level security;

create policy "Users read own assignments"
  on task_assignments for select using (auth.uid() = user_id);

create policy "Users update own assignments"
  on task_assignments for update using (auth.uid() = user_id);

create policy "Executives manage assignments"
  on task_assignments for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

-- ─── 4. ENTREGAS (completions) ───────────────────────────────────────────────
create table if not exists task_completions (
  id             uuid default gen_random_uuid() primary key,
  assignment_id  uuid references task_assignments on delete cascade not null,
  task_id        uuid references tasks not null,
  user_id        uuid references auth.users not null,
  completed_at   timestamptz default now(),
  is_on_time     boolean not null,
  comments       text,
  vobo_status    text default 'not_required'
                 check (vobo_status in ('not_required','pending','approved','rejected')),
  vobo_by        uuid references auth.users,
  vobo_at        timestamptz,
  vobo_comment   text,
  attempt_number integer default 1,
  created_at     timestamptz default now()
);

create index if not exists idx_completions_task    on task_completions (task_id);
create index if not exists idx_completions_user    on task_completions (user_id);
create index if not exists idx_completions_vobo    on task_completions (vobo_status);
create index if not exists idx_completions_assign  on task_completions (assignment_id);

alter table task_completions enable row level security;

create policy "Users read own completions"
  on task_completions for select using (auth.uid() = user_id);

create policy "Users insert own completions"
  on task_completions for insert with check (auth.uid() = user_id);

create policy "Executives manage completions"
  on task_completions for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

-- ─── 5. EVIDENCIAS ───────────────────────────────────────────────────────────
-- Nota: completion_id es nullable para compatibilidad con el flujo de upload
-- (los archivos se suben antes de presionar "Completar"; se actualiza al completar).
create table if not exists task_evidence (
  id            uuid default gen_random_uuid() primary key,
  completion_id uuid references task_completions on delete cascade,  -- nullable durante upload
  task_id       text not null,                 -- text para compatibilidad (el campo era text antes)
  user_id       uuid references auth.users not null,
  file_url      text not null,
  file_name     text not null,
  file_type     text not null,                 -- ext raw: 'jpg','pdf','xlsx','mp4', etc.
  file_size     integer,
  uploaded_at   timestamptz default now()
);

create index if not exists idx_evidence_task       on task_evidence (task_id);
create index if not exists idx_evidence_user       on task_evidence (user_id);
create index if not exists idx_evidence_completion on task_evidence (completion_id);

alter table task_evidence enable row level security;

create policy "Users manage own evidence"
  on task_evidence for all using (auth.uid() = user_id);

create policy "Executives read all evidence"
  on task_evidence for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

-- ─── 6. LOG DE VOBO ──────────────────────────────────────────────────────────
create table if not exists vobo_log (
  id            uuid default gen_random_uuid() primary key,
  completion_id uuid references task_completions not null,
  task_id       uuid references tasks not null,
  user_id       uuid references auth.users not null,
  executive_id  uuid references auth.users not null,
  action        text not null check (action in ('approved', 'rejected')),
  comment       text,
  created_at    timestamptz default now()
);

create index if not exists idx_vobo_log_completion on vobo_log (completion_id);
create index if not exists idx_vobo_log_task       on vobo_log (task_id);
create index if not exists idx_vobo_log_user       on vobo_log (user_id);

alter table vobo_log enable row level security;

create policy "Executives manage vobo log"
  on vobo_log for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

create policy "Users read own vobo log"
  on vobo_log for select using (auth.uid() = user_id);

-- ─── 7. HISTORIAL DE PERÍODOS ────────────────────────────────────────────────
create table if not exists task_periods (
  id           uuid default gen_random_uuid() primary key,
  task_id      uuid references tasks not null,
  period_start timestamptz not null,
  period_end   timestamptz not null,
  created_at   timestamptz default now()
);

create index if not exists idx_periods_task on task_periods (task_id);

alter table task_periods enable row level security;

create policy "Executives manage periods"
  on task_periods for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'executive');

create policy "Field users read periods"
  on task_periods for select using (
    exists (
      select 1 from task_assignments
      where task_assignments.task_id = task_periods.task_id
        and task_assignments.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- DATOS DE PRUEBA — eliminar antes de producción
-- ═══════════════════════════════════════════════════════════════════════════

-- Para registrar un perfil al crear un usuario (trigger automático):
-- create or replace function handle_new_user()
-- returns trigger language plpgsql security definer set search_path = public as $$
-- begin
--   insert into user_profiles (id, email, full_name, role)
--   values (
--     new.id,
--     new.email,
--     coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
--     coalesce(new.raw_app_meta_data->>'role', 'field')
--   );
--   return new;
-- end $$;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function handle_new_user();
