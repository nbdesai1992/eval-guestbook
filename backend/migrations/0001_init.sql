create table if not exists entries (
  id         bigint generated always as identity primary key,
  name       text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists entries_created_idx on entries (created_at desc, id desc);
