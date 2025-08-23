-- Table to track API usage for rate limiting
create table api_usage (
    id bigserial primary key,
    user_id uuid references public.profiles(id) not null,
    created_at timestamp with time zone default now()
);

alter table api_usage enable row level security;

-- Users can see their own usage history
create policy "Users can view their own API usage." on api_usage
  for select using (auth.uid() = user_id);

-- Only service roles (like Edge Functions) can insert new usage records.
-- This prevents users from clearing their own history or adding fake entries.
create policy "Service roles can insert API usage." on api_usage
  for insert with check (auth.role() = 'service_role');
