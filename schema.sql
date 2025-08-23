-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  user_role text default 'client', -- 'client' or 'trainer'

  constraint username_length check (char_length(username) >= 3)
);

alter table profiles
  enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, user_role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'user_role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Table for trainers to manage their clients
create table clients (
    id bigserial primary key,
    trainer_id uuid references public.profiles(id) not null,
    client_id uuid references public.profiles(id) not null,
    created_at timestamp with time zone default now()
);

alter table clients enable row level security;
create policy "Trainers can manage their own clients." on clients using (auth.uid() = trainer_id);


-- Tables for workout programs
create table workout_programs (
    id bigserial primary key,
    trainer_id uuid references public.profiles(id) not null,
    client_id uuid references public.profiles(id),
    name text not null,
    description text,
    created_at timestamp with time zone default now()
);

alter table workout_programs enable row level security;
create policy "Trainers can manage their workout programs." on workout_programs for all using (auth.uid() = trainer_id);
create policy "Clients can view their assigned workout programs." on workout_programs for select using (auth.uid() = client_id);


create table exercises (
    id bigserial primary key,
    trainer_id uuid references public.profiles(id) not null, -- who created it
    name text not null,
    description text,
    photo_url text,
    video_url text,
    created_at timestamp with time zone default now()
);

alter table exercises enable row level security;
create policy "Trainers can manage their exercises." on exercises for all using (auth.uid() = trainer_id);
create policy "Clients can view all exercises." on exercises for select using (true);


create table workout_program_days (
    id bigserial primary key,
    program_id bigint references workout_programs(id) on delete cascade,
    day_name text not null -- e.g., "Day 1", "Monday"
);

alter table workout_program_days enable row level security;
create policy "Users can view workout program days." on workout_program_days for select using (true);
create policy "Trainers can manage workout program days." on workout_program_days for all using (
    exists (select 1 from workout_programs where workout_programs.id = program_id and workout_programs.trainer_id = auth.uid())
);


create table workout_day_exercises (
    id bigserial primary key,
    workout_day_id bigint references workout_program_days(id) on delete cascade,
    exercise_id bigint references exercises(id),
    sets int,
    reps text, -- e.g., "8-12"
    notes text
);

alter table workout_day_exercises enable row level security;
create policy "Users can view exercises for a workout day." on workout_day_exercises for select using (true);
create policy "Trainers can manage exercises for a workout day." on workout_day_exercises for all using (
    exists (
        select 1 from workout_program_days wpd
        join workout_programs wp on wp.id = wpd.program_id
        where wpd.id = workout_day_id and wp.trainer_id = auth.uid()
    )
);


-- Tables for meal plans
create table meal_plans (
    id bigserial primary key,
    trainer_id uuid references public.profiles(id) not null,
    client_id uuid references public.profiles(id),
    name text not null,
    description text,
    created_at timestamp with time zone default now()
);

alter table meal_plans enable row level security;
create policy "Trainers can manage their meal plans." on meal_plans for all using (auth.uid() = trainer_id);
create policy "Clients can view their assigned meal plans." on meal_plans for select using (auth.uid() = client_id);

create table foods (
    id bigserial primary key,
    trainer_id uuid references public.profiles(id) not null, -- who created it
    name text not null,
    calories float,
    protein float,
    carbs float,
    fat float,
    photo_url text,
    created_at timestamp with time zone default now()
);

alter table foods enable row level security;
create policy "Trainers can manage their foods." on foods for all using (auth.uid() = trainer_id);
create policy "Clients can view all foods." on foods for select using (true);


create table meal_plan_days (
    id bigserial primary key,
    meal_plan_id bigint references meal_plans(id) on delete cascade,
    day_name text not null -- e.g., "Day 1", "Monday"
);

alter table meal_plan_days enable row level security;
create policy "Users can view meal plan days." on meal_plan_days for select using (true);
create policy "Trainers can manage meal plan days." on meal_plan_days for all using (
    exists (select 1 from meal_plans where meal_plans.id = meal_plan_id and meal_plans.trainer_id = auth.uid())
);

create table meal_day_foods (
    id bigserial primary key,
    meal_day_id bigint references meal_plan_days(id) on delete cascade,
    food_id bigint references foods(id),
    meal_type text, -- e.g., "Breakfast", "Lunch"
    quantity text -- e.g., "100g", "1 cup"
);

alter table meal_day_foods enable row level security;
create policy "Users can view foods for a meal day." on meal_day_foods for select using (true);
create policy "Trainers can manage foods for a meal day." on meal_day_foods for all using (
    exists (
        select 1 from meal_plan_days mpd
        join meal_plans mp on mp.id = mpd.meal_plan_id
        where mpd.id = meal_day_id and mp.trainer_id = auth.uid()
    )
);


-- Table for chat
create table messages (
    id bigserial primary key,
    sender_id uuid references public.profiles(id),
    receiver_id uuid references public.profiles(id),
    content text,
    created_at timestamp with time zone default now()
);

alter table messages enable row level security;
create policy "Users can send and receive their own messages." on messages
    for all using (auth.uid() = sender_id or auth.uid() = receiver_id);


-- Tables for goals and progress
create table goals (
    id bigserial primary key,
    client_id uuid references public.profiles(id) not null,
    start_date date not null,
    end_date date not null,
    description text,
    created_at timestamp with time zone default now()
);
alter table goals enable row level security;
create policy "Clients can manage their own goals." on goals for all using (auth.uid() = client_id);
create policy "Trainers can view the goals of their clients." on goals for select using (
    exists (select 1 from clients where clients.client_id = goals.client_id and clients.trainer_id = auth.uid())
);


create table progress_photos (
    id bigserial primary key,
    goal_id bigint references goals(id) on delete cascade,
    photo_url text not null,
    photo_date date not null,
    created_at timestamp with time zone default now()
);

alter table progress_photos enable row level security;
create policy "Clients can manage their own progress photos." on progress_photos for all using (
    exists (select 1 from goals where goals.id = goal_id and goals.client_id = auth.uid())
);
create policy "Trainers can view the progress photos of their clients." on progress_photos for select using (
    exists (
        select 1 from goals g
        join clients c on c.client_id = g.client_id
        where g.id = goal_id and c.trainer_id = auth.uid()
    )
);

-- Storage policies
-- Policies for avatars
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');

create policy "Anyone can update their own avatar." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'avatars');

-- Policies for exercise photos
create policy "Exercise photos are publicly accessible." on storage.objects
  for select using (bucket_id = 'exercise_photos');

create policy "Trainers can upload exercise photos." on storage.objects
  for insert with check (bucket_id = 'exercise_photos' and (select user_role from public.profiles where id = auth.uid()) = 'trainer');

create policy "Trainers can update their own exercise photos." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'exercise_photos');


-- Policies for food photos
create policy "Food photos are publicly accessible." on storage.objects
  for select using (bucket_id = 'food_photos');

create policy "Trainers can upload food photos." on storage.objects
  for insert with check (bucket_id = 'food_photos' and (select user_role from public.profiles where id = auth.uid()) = 'trainer');

create policy "Trainers can update their own food photos." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'food_photos');


-- Policies for progress photos
create policy "Progress photos are protected." on storage.objects
  for select using (bucket_id = 'progress_photos' and (
    auth.uid() = owner or
    exists (
        select 1
        from progress_photos pp
        join goals g on g.id = pp.goal_id
        join clients c on c.client_id = g.client_id
        where pp.photo_url like '%' || storage.objects.name and c.trainer_id = auth.uid()
    )
  ));

create policy "Clients can upload their own progress photos." on storage.objects
  for insert with check (bucket_id = 'progress_photos' and auth.uid() = owner);

create policy "Clients can update their own progress photos." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'progress_photos');
