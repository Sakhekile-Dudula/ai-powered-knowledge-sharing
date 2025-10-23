-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  email text,
  role text default 'User',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create profiles policy
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Create messages policy
create policy "Users can view messages they sent or received"
  on messages for select
  using (
    auth.uid() = sender_id or
    auth.uid() = recipient_id
  );

create policy "Users can insert messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
  );

-- Function to handle new user registration
create or replace function public.handle_new_user() 
returns trigger 
language plpgsql 
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$;

-- Trigger to automatically create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create RLS policies for realtime subscriptions
create policy "Allow users to subscribe to their own messages"
  on messages for select
  using (
    auth.uid() in (sender_id, recipient_id)
  );