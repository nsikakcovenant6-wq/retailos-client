-- Apply once to the existing PostgreSQL database before deploying the commerce features.
create table if not exists customers (
 id uuid primary key default gen_random_uuid(), name varchar(180) not null,
 phone varchar(40), email varchar(180), active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists customers_name_idx on customers(name);
alter table products add column if not exists item_type varchar(12) not null default 'PRODUCT';
alter table products add column if not exists base_unit varchar(40) not null default 'piece';
alter table products add column if not exists low_stock_threshold numeric(14,3) not null default 5;
alter table products add constraint products_item_type_check check (item_type in ('PRODUCT','SERVICE'));
create table if not exists product_units (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id),
 name varchar(50) not null, base_quantity numeric(14,3) not null check(base_quantity>0),
 price numeric(14,2) not null check(price>=0), unique(product_id,name)
);
insert into product_units(product_id,name,base_quantity,price)
select id,base_unit,1,selling_price from products on conflict(product_id,name) do nothing;
alter table sales add column if not exists customer_id uuid references customers(id);
alter table sales add column if not exists amount_paid numeric(14,2) not null default 0;
update sales set amount_paid=total_amount where amount_paid=0 and status='COMPLETED';
alter table sale_items add column if not exists unit_name varchar(50) not null default 'piece';
alter table sale_items add column if not exists base_quantity numeric(14,3);
update sale_items set base_quantity=quantity where base_quantity is null;
create table if not exists sale_payments (
 id uuid primary key default gen_random_uuid(), sale_id uuid not null references sales(id),
 amount numeric(14,2) not null check(amount>0), method payment_method not null,
 recorded_by uuid not null references users(id), created_at timestamptz not null default now()
);
create index if not exists sale_payments_sale_idx on sale_payments(sale_id);
