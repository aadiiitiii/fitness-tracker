-- Workouts
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  exercises jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table workouts enable row level security;
create policy "own workouts" on workouts for all using (auth.uid() = user_id);

-- Food logs
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  meals jsonb not null default '[]',
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table food_logs enable row level security;
create policy "own food_logs" on food_logs for all using (auth.uid() = user_id);

-- Ratings
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  workout int default 5,
  nutrition int default 5,
  energy int default 5,
  sleep int default 5,
  notes text default '',
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table ratings enable row level security;
create policy "own ratings" on ratings for all using (auth.uid() = user_id);

-- Weight log
create table if not exists weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  kg float not null,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table weight_log enable row level security;
create policy "own weight_log" on weight_log for all using (auth.uid() = user_id);

-- Water log
create table if not exists water_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  glasses int default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);
alter table water_log enable row level security;
create policy "own water_log" on water_log for all using (auth.uid() = user_id);

-- Targets
create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  calories int default 2000,
  protein int default 150,
  carbs int default 200,
  fat int default 65,
  unique(user_id)
);
alter table targets enable row level security;
create policy "own targets" on targets for all using (auth.uid() = user_id);

-- Custom foods
create table if not exists custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  calories float,
  protein float,
  carbs float,
  fat float,
  serving text,
  created_at timestamptz default now(),
  unique(user_id, name)
);
alter table custom_foods enable row level security;
create policy "own custom_foods" on custom_foods for all using (auth.uid() = user_id);

-- Recent foods (one row per user, stores array as jsonb)
create table if not exists recent_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  foods jsonb not null default '[]',
  unique(user_id)
);
alter table recent_foods enable row level security;
create policy "own recent_foods" on recent_foods for all using (auth.uid() = user_id);
