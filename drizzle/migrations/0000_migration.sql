create type public.app_role as enum ('admin','coordenacao','professor','aluno');

create table public.schools (id uuid primary key default gen_random_uuid(), name text not null, city text not null default '', created_at timestamptz not null default now());
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', email text not null default '', school_id uuid references public.schools(id) on delete set null, must_set_password boolean not null default false, created_at timestamptz not null default now());
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role public.app_role not null, unique(user_id, role));
create table public.classes (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, name text not null, created_at timestamptz not null default now());
create table public.class_teachers (class_id uuid not null references public.classes(id) on delete cascade, teacher_id uuid not null references public.profiles(id) on delete cascade, subject text not null default '', primary key (class_id, teacher_id));
create table public.class_students (class_id uuid not null references public.classes(id) on delete cascade, student_id uuid not null references public.profiles(id) on delete cascade, primary key (class_id, student_id));
create table public.cycles (id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade, name text not null, starts_on date not null, ends_on date not null, status text not null default 'rascunho', created_at timestamptz not null default now());
create table public.questions (id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.cycles(id) on delete cascade, text text not null, position int not null default 0);
create table public.evaluation_receipts (cycle_id uuid not null references public.cycles(id) on delete cascade, teacher_id uuid not null references public.profiles(id) on delete cascade, student_id uuid not null references public.profiles(id) on delete cascade, primary key (cycle_id, teacher_id, student_id));
create table public.evaluations (id uuid primary key default gen_random_uuid(), cycle_id uuid not null references public.cycles(id) on delete cascade, teacher_id uuid not null references public.profiles(id) on delete cascade, comment text, created_at timestamptz not null default now());
create table public.answers (evaluation_id uuid not null references public.evaluations(id) on delete cascade, question_id uuid not null references public.questions(id) on delete cascade, score int not null, primary key (evaluation_id, question_id));

grant select on public.profiles, public.user_roles to authenticated;
grant all on public.schools, public.profiles, public.user_roles, public.classes, public.class_teachers, public.class_students, public.cycles, public.questions, public.evaluation_receipts, public.evaluations, public.answers to service_role;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_students enable row level security;
alter table public.cycles enable row level security;
alter table public.questions enable row level security;
alter table public.evaluation_receipts enable row level security;
alter table public.evaluations enable row level security;
alter table public.answers enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();