-- ================================================================
-- BIZZKIT DATABASE SCHEMA
-- Run this entire file in Supabase → SQL Editor → New Query
-- ================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ── PROFILES (extends Supabase auth.users) ──────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  first_name  text not null,
  last_name   text not null,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── BUSINESSES ──────────────────────────────────────────────────
create table public.businesses (
  id          uuid default uuid_generate_v4() primary key,
  owner_id    uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  tagline     text default '',
  description text default '',
  industry    text not null,
  type        text default 'B2B',
  city        text not null,
  country     text not null,
  website     text default '',
  phone       text default '',
  founded     text default '',
  logo        text not null,
  grad        text default 'gr1',
  kyc_verified boolean default false,
  certified   boolean default false,
  trust_score integer default 45,
  trust_tier  text default 'Bronze',
  followers   integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.businesses enable row level security;
create policy "Businesses are viewable by everyone"
  on public.businesses for select using (true);
create policy "Users can insert their own business"
  on public.businesses for insert with check (auth.uid() = owner_id);
create policy "Users can update their own business"
  on public.businesses for update using (auth.uid() = owner_id);
create policy "Users can delete their own business"
  on public.businesses for delete using (auth.uid() = owner_id);

-- ── PRODUCTS ────────────────────────────────────────────────────
create table public.products (
  id          uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name        text not null,
  description text default '',
  price       text default '',
  emoji       text default '📦',
  category    text default 'General',
  created_at  timestamptz default now()
);
alter table public.products enable row level security;
create policy "Products are viewable by everyone"
  on public.products for select using (true);
create policy "Business owners can manage products"
  on public.products for all using (
    auth.uid() = (select owner_id from public.businesses where id = business_id)
  );

-- ── CONNECTIONS ─────────────────────────────────────────────────
create table public.connections (
  id          uuid default uuid_generate_v4() primary key,
  from_biz_id uuid references public.businesses(id) on delete cascade not null,
  to_biz_id   uuid references public.businesses(id) on delete cascade not null,
  status      text default 'accepted',
  created_at  timestamptz default now(),
  unique(from_biz_id, to_biz_id)
);
alter table public.connections enable row level security;
create policy "Connections are viewable by everyone"
  on public.connections for select using (true);
create policy "Business owners can create connections"
  on public.connections for insert with check (
    auth.uid() = (select owner_id from public.businesses where id = from_biz_id)
  );
create policy "Business owners can delete their connections"
  on public.connections for delete using (
    auth.uid() = (select owner_id from public.businesses where id = from_biz_id)
    or auth.uid() = (select owner_id from public.businesses where id = to_biz_id)
  );

-- ── SAVED BUSINESSES ────────────────────────────────────────────
create table public.saved_businesses (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user_id, business_id)
);
alter table public.saved_businesses enable row level security;
create policy "Users can view their own saved businesses"
  on public.saved_businesses for select using (auth.uid() = user_id);
create policy "Users can save businesses"
  on public.saved_businesses for insert with check (auth.uid() = user_id);
create policy "Users can unsave businesses"
  on public.saved_businesses for delete using (auth.uid() = user_id);

-- ── CONFERENCES ─────────────────────────────────────────────────
create table public.conferences (
  id          uuid default uuid_generate_v4() primary key,
  organizer_id uuid references public.businesses(id) on delete cascade not null,
  title       text not null,
  description text default '',
  date        date not null,
  time        text not null,
  industry    text default 'General',
  location    text default '',
  max_attendees integer default 15,
  status      text default 'upcoming',
  created_at  timestamptz default now()
);
alter table public.conferences enable row level security;
create policy "Conferences are viewable by everyone"
  on public.conferences for select using (true);
create policy "Business owners can create conferences"
  on public.conferences for insert with check (
    auth.uid() = (select owner_id from public.businesses where id = organizer_id)
  );
create policy "Organizers can update their conferences"
  on public.conferences for update using (
    auth.uid() = (select owner_id from public.businesses where id = organizer_id)
  );
create policy "Organizers can delete their conferences"
  on public.conferences for delete using (
    auth.uid() = (select owner_id from public.businesses where id = organizer_id)
  );

-- ── CONFERENCE ATTENDEES ─────────────────────────────────────────
create table public.conference_attendees (
  id            uuid default uuid_generate_v4() primary key,
  conference_id uuid references public.conferences(id) on delete cascade not null,
  business_id   uuid references public.businesses(id) on delete cascade not null,
  joined_at     timestamptz default now(),
  unique(conference_id, business_id)
);
alter table public.conference_attendees enable row level security;
create policy "Attendees are viewable by everyone"
  on public.conference_attendees for select using (true);
create policy "Business owners can join conferences"
  on public.conference_attendees for insert with check (
    auth.uid() = (select owner_id from public.businesses where id = business_id)
  );
create policy "Business owners can leave conferences"
  on public.conference_attendees for delete using (
    auth.uid() = (select owner_id from public.businesses where id = business_id)
  );

-- ── CHATS ────────────────────────────────────────────────────────
create table public.chats (
  id            uuid default uuid_generate_v4() primary key,
  participant_a uuid references public.businesses(id) on delete cascade not null,
  participant_b uuid references public.businesses(id) on delete cascade not null,
  created_at    timestamptz default now(),
  unique(participant_a, participant_b)
);
alter table public.chats enable row level security;
create policy "Chat participants can view their chats"
  on public.chats for select using (
    auth.uid() = (select owner_id from public.businesses where id = participant_a)
    or auth.uid() = (select owner_id from public.businesses where id = participant_b)
  );
create policy "Business owners can create chats"
  on public.chats for insert with check (
    auth.uid() = (select owner_id from public.businesses where id = participant_a)
    or auth.uid() = (select owner_id from public.businesses where id = participant_b)
  );

-- ── MESSAGES ────────────────────────────────────────────────────
create table public.messages (
  id          uuid default uuid_generate_v4() primary key,
  chat_id     uuid references public.chats(id) on delete cascade not null,
  sender_id   uuid references public.businesses(id) on delete cascade not null,
  text        text not null,
  read        boolean default false,
  created_at  timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Chat participants can view messages"
  on public.messages for select using (
    auth.uid() = (select owner_id from public.businesses where id = sender_id)
    or auth.uid() in (
      select b.owner_id from public.businesses b
      join public.chats c on (c.participant_a = b.id or c.participant_b = b.id)
      where c.id = chat_id
    )
  );
create policy "Business owners can send messages"
  on public.messages for insert with check (
    auth.uid() = (select owner_id from public.businesses where id = sender_id)
  );
create policy "Recipients can mark messages as read"
  on public.messages for update using (
    auth.uid() in (
      select b.owner_id from public.businesses b
      join public.chats c on (c.participant_a = b.id or c.participant_b = b.id)
      where c.id = chat_id
    )
  );

-- ── CALL ROOMS ──────────────────────────────────────────────────
create table public.call_rooms (
  id          uuid default uuid_generate_v4() primary key,
  chat_id     uuid references public.chats(id) on delete cascade not null,
  room_url    text not null,
  room_name   text not null,
  created_by  uuid references public.businesses(id) on delete cascade not null,
  status      text default 'active',
  created_at  timestamptz default now()
);
alter table public.call_rooms enable row level security;
create policy "Chat participants can view call rooms"
  on public.call_rooms for select using (
    auth.uid() in (
      select b.owner_id from public.businesses b
      join public.chats c on (c.participant_a = b.id or c.participant_b = b.id)
      where c.id = chat_id
    )
  );
create policy "Business owners can create call rooms"
  on public.call_rooms for insert with check (
    auth.uid() = (select owner_id from public.businesses where id = created_by)
  );
create policy "Call creators can update rooms"
  on public.call_rooms for update using (
    auth.uid() = (select owner_id from public.businesses where id = created_by)
  );

-- ── ENABLE REALTIME ─────────────────────────────────────────────
-- Run these to enable real-time subscriptions
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.connections;
alter publication supabase_realtime add table public.call_rooms;
alter publication supabase_realtime add table public.conference_attendees;

-- ── HELPER FUNCTION: auto-create profile on signup ──────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── HELPER FUNCTION: get or create chat ─────────────────────────
create or replace function public.get_or_create_chat(biz_a uuid, biz_b uuid)
returns uuid language plpgsql security definer
as $$
declare
  chat_id uuid;
  a_sorted uuid;
  b_sorted uuid;
begin
  -- Always store in consistent order so unique constraint works
  if biz_a < biz_b then a_sorted := biz_a; b_sorted := biz_b;
  else a_sorted := biz_b; b_sorted := biz_a;
  end if;

  select id into chat_id from public.chats
  where participant_a = a_sorted and participant_b = b_sorted;

  if chat_id is null then
    insert into public.chats (participant_a, participant_b)
    values (a_sorted, b_sorted)
    returning id into chat_id;
  end if;

  return chat_id;
end;
$$;
