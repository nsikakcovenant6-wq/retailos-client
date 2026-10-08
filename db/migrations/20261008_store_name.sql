-- Run once against the PostgreSQL database before enabling store name editing.
create table if not exists store_settings (
  id integer primary key default 1 check (id=1),
  name varchar(160) not null default 'My Store',
  updated_at timestamptz not null default now()
);
insert into store_settings(id,name) values (1,'My Store') on conflict (id) do nothing;
