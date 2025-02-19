-- Create profiles table for user roles
create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  role text not null check (role in ('student', 'lecturer')),
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS (Row Level Security)
alter table public.profiles enable row level security;

-- Create policy for profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Create theses table
create table public.theses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  student_id uuid references public.profiles(id),
  status text not null check (status in ('draft', 'submitted', 'reviewed', 'approved')) default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.theses enable row level security;

-- Create policies for theses
create policy "Students can view their own theses"
  on public.theses for select
  using ( auth.uid() = student_id );

create policy "Lecturers can view all theses"
  on public.theses for select
  using ( (select role from public.profiles where id = auth.uid()) = 'lecturer' );

create policy "Students can create their own theses"
  on public.theses for insert
  with check ( auth.uid() = student_id );

create policy "Students can update their own theses"
  on public.theses for update
  using ( auth.uid() = student_id );

-- Create chapters table
create table public.chapters (
  id uuid default uuid_generate_v4() primary key,
  thesis_id uuid references public.theses(id) on delete cascade,
  chapter_number integer not null,
  content text,
  last_updated timestamptz default now(),
  created_at timestamptz default now(),
  unique (thesis_id, chapter_number)
);

-- Enable RLS
alter table public.chapters enable row level security;

-- Create policies for chapters
create policy "Students can view their own chapters"
  on public.chapters for select
  using ( auth.uid() = (select student_id from public.theses where id = thesis_id) );

create policy "Lecturers can view all chapters"
  on public.chapters for select
  using ( (select role from public.profiles where id = auth.uid()) = 'lecturer' );

create policy "Students can insert their own chapters"
  on public.chapters for insert
  with check ( auth.uid() = (select student_id from public.theses where id = thesis_id) );

create policy "Students can update their own chapters"
  on public.chapters for update
  using ( auth.uid() = (select student_id from public.theses where id = thesis_id) );

-- Create ai_reviews table
create table public.ai_reviews (
  id uuid default uuid_generate_v4() primary key,
  chapter_id uuid references public.chapters(id) on delete cascade,
  review_content text not null,
  reviewed_at timestamptz default now()
);

-- Enable RLS
alter table public.ai_reviews enable row level security;

-- Create policies for ai_reviews
create policy "Students can view reviews of their chapters"
  on public.ai_reviews for select
  using ( 
    auth.uid() = (
      select student_id 
      from public.theses t 
      join public.chapters c on c.thesis_id = t.id 
      where c.id = chapter_id
    )
  );

create policy "Lecturers can view all reviews"
  on public.ai_reviews for select
  using ( (select role from public.profiles where id = auth.uid()) = 'lecturer' );

create policy "Anyone can insert AI reviews"
  on public.ai_reviews for insert
  with check ( true );

-- Drop existing trigger first
drop trigger if exists on_auth_user_created on auth.users;

-- Create improved trigger function
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql as $$
declare
  user_role text;
  user_email text;
  existing_profile_count integer;
begin
  -- Get role directly from metadata
  user_role := coalesce(
    new.raw_user_meta_data->>'role',  -- Primary source
    new.raw_app_meta_data->>'role'    -- Backup source
  );
  
  -- Validate role is either student or lecturer
  if user_role is null or user_role not in ('student', 'lecturer') then
    raise exception 'Invalid role specified: %', user_role;
  end if;
  
  user_email := coalesce(new.email, new.raw_user_meta_data->>'email');
  
  -- Check if profile already exists to prevent duplicates
  select count(*) into existing_profile_count
  from public.profiles
  where id = new.id;
  
  if existing_profile_count > 0 then
    raise log 'Profile already exists for user %', new.id;
    return new;
  end if;
  
  -- Log the values for debugging
  raise log 'Creating profile for user % with role % and email %', new.id, user_role, user_email;
  
  -- Insert profile with the specified role
  insert into public.profiles (id, email, role)
  values (new.id, user_email, user_role);
  
  return new;
exception when others then
  raise log 'Error in handle_new_user: %', SQLERRM;
  return new; -- Still create the user even if profile creation fails
end;
$$;

-- Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();