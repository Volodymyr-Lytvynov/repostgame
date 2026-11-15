create table if not exists rooms (
  code text primary key,
  state jsonb not null,
  version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists image_cache (
  query text primary key,
  photos jsonb not null,
  fetched_at timestamptz not null default now()
);
