create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('patient', 'doctor')),
  gender text check (gender in ('male', 'female', 'other', 'prefer-not-to-say')),
  dob date,
  specialization text,
  license_number text,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users alter column phone drop not null;
alter table public.users alter column gender drop not null;
alter table public.users alter column dob drop not null;

create unique index if not exists users_email_lower_idx on public.users (lower(email));
create index if not exists users_approved_doctors_idx
  on public.users (role, approval_status, name);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  doctor_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  time text not null,
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'upcoming', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);
create index if not exists appointments_date_idx on public.appointments (date);
create index if not exists appointments_patient_idx on public.appointments (user_id);
create index if not exists appointments_doctor_idx on public.appointments (doctor_id);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null default 'info',
  created_at timestamptz not null default now()
);
create index if not exists alerts_user_created_idx on public.alerts (user_id, created_at desc);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  time text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists availability_doctor_date_idx on public.availability (doctor_id, date, time);

create table if not exists public.health_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  score numeric not null,
  result text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists health_assessments_user_created_idx
  on public.health_assessments (user_id, created_at desc);

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  type text not null,
  description text not null default '',
  doctor_name text not null default '',
  record_date date,
  file_name text not null,
  file_path text not null,
  public_url text,
  file_size bigint not null,
  file_type text not null,
  original_name text not null,
  created_at timestamptz not null default now()
);
create index if not exists medical_records_user_created_idx
  on public.medical_records (user_id, created_at desc);

alter table public.users enable row level security;
alter table public.appointments enable row level security;
alter table public.alerts enable row level security;
alter table public.availability enable row level security;
alter table public.health_assessments enable row level security;
alter table public.medical_records enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('medical-records', 'medical-records', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;
