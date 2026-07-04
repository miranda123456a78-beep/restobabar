-- ============================================================
-- SISTEMA DE GESTIÓN PARA CEVICHERÍA
-- Esquema completo para Supabase (PostgreSQL)
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. TABLA DE PERFILES (vinculada a auth.users)
-- ============================================================
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('admin', 'mozo', 'cocina')),
  activo boolean default true,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data is null then
    insert into public.perfiles (id, nombre, rol)
    values (new.id, new.email, 'mozo');
  else
    insert into public.perfiles (id, nombre, rol)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
      coalesce(new.raw_user_meta_data ->> 'rol', 'mozo')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. MESAS
-- ============================================================
create table if not exists public.mesas (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,
  nombre text,
  ubicacion text default 'salón principal',
  estado text not null default 'libre' check (estado in ('libre', 'ocupada', 'reservada')),
  created_at timestamptz default now()
);

-- ============================================================
-- 3. PRODUCTOS (catálogo / menú)
-- ============================================================
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null check (categoria in ('bebida', 'entrada', 'plato de fondo', 'postre', 'extra')),
  precio numeric(10,2) not null check (precio >= 0),
  es_comida boolean not null default true,
  stock numeric(10,2) not null default 0 check (stock >= 0),
  activo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 4. COMANDAS
-- ============================================================
create table if not exists public.comandas (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references public.mesas(id) on delete restrict,
  mozo_id uuid not null references public.perfiles(id) on delete restrict,
  estado text not null default 'abierta' check (estado in ('abierta', 'pagada', 'cancelada')),
  fecha_apertura timestamptz default now(),
  fecha_cierre timestamptz,
  total numeric(10,2) default 0,
  descuento numeric(10,2) default 0 check (descuento >= 0),
  metodo_pago text check (metodo_pago in ('efectivo', 'tarjeta', 'yape', 'plin', 'transferencia')),
  created_at timestamptz default now()
);

-- ============================================================
-- 5. COMANDA_ITEMS (detalle de cada pedido)
-- ============================================================
create table if not exists public.comanda_items (
  id uuid primary key default gen_random_uuid(),
  comanda_id uuid not null references public.comandas(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete restrict,
  cantidad numeric(10,2) not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,
  estado_cocina text default 'pendiente' check (estado_cocina in ('pendiente', 'en preparacion', 'listo')),
  created_at timestamptz default now()
);

-- ============================================================
-- 6. MOVIMIENTOS_STOCK (auditoría de inventario)
-- ============================================================
create table if not exists public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete restrict,
  tipo text not null check (tipo in ('entrada', 'salida')),
  cantidad numeric(10,2) not null check (cantidad > 0),
  motivo text not null,
  comanda_id uuid references public.comandas(id) on delete set null,
  creado_por uuid references public.perfiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 7. ÍNDICES PARA RENDIMIENTO
-- ============================================================
create index idx_comandas_mozo on public.comandas(mozo_id);
create index idx_comandas_mesa on public.comandas(mesa_id);
create index idx_comandas_estado on public.comandas(estado);
create index idx_comanda_items_comanda on public.comanda_items(comanda_id);
create index idx_comanda_items_estado on public.comanda_items(estado_cocina);
create index idx_productos_es_comida on public.productos(es_comida);
create index idx_movimientos_producto on public.movimientos_stock(producto_id);
create index idx_movimientos_fecha on public.movimientos_stock(created_at);

-- ============================================================
-- 8. DATOS INICIALES DE EJEMPLO (antes de RLS)
-- ============================================================

insert into public.mesas (numero, nombre, ubicacion)
select * from (values
  (1, 'Mesa 1', 'salón principal'),
  (2, 'Mesa 2', 'salón principal'),
  (3, 'Mesa 3', 'salón principal'),
  (4, 'Mesa 4', 'terraza'),
  (5, 'Mesa 5', 'terraza'),
  (6, 'Mesa 6', 'barra')
) as v
where not exists (select 1 from public.mesas);

insert into public.productos (nombre, categoria, precio, es_comida, stock)
select * from (values
  ('Ceviche Clásico', 'plato de fondo', 28.00, true, 20),
  ('Ceviche Mixto', 'plato de fondo', 35.00, true, 15),
  ('Leche de Tigre', 'entrada', 18.00, true, 25),
  ('Papa a la Huancaína', 'entrada', 15.00, true, 20),
  ('Arroz con Mariscos', 'plato de fondo', 32.00, true, 15),
  ('Jalea Mixta', 'plato de fondo', 30.00, true, 12),
  ('Causa Rellena', 'entrada', 16.00, true, 18),
  ('Picante de Mariscos', 'plato de fondo', 34.00, true, 10),
  ('Suspiro Limeño', 'postre', 12.00, true, 15),
  ('Cerveza Cristal 630ml', 'bebida', 10.00, false, 48),
  ('Cerveza Pilsen 630ml', 'bebida', 10.00, false, 48),
  ('Cerveza Cusqueña 630ml', 'bebida', 12.00, false, 36),
  ('Inca Kola 500ml', 'bebida', 5.00, false, 60),
  ('Coca Cola 500ml', 'bebida', 5.00, false, 60),
  ('Agua Mineral 500ml', 'bebida', 3.00, false, 48),
  ('Chicha Morada 500ml', 'bebida', 5.00, false, 30)
) as v
where not exists (select 1 from public.productos);

-- ============================================================
-- 9. FUNCIÓN: COBRAR COMANDA (descuenta stock + cierra)
-- ============================================================
create or replace function public.cobrar_comanda(
  p_comanda_id uuid,
  p_descuento numeric default 0,
  p_metodo_pago text default 'efectivo'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric(10,2);
  v_mesa_id uuid;
  v_item record;
  v_stock_actual numeric(10,2);
  alertas text[] := '{}';
begin
  if not exists (
    select 1 from public.comandas
    where id = p_comanda_id and estado = 'abierta'
  ) then
    return jsonb_build_object('success', false, 'error', 'La comanda no está abierta');
  end if;

  select coalesce(sum(ci.cantidad * ci.precio_unitario), 0)
  into v_total
  from public.comanda_items ci
  where ci.comanda_id = p_comanda_id;

  v_total := v_total - coalesce(p_descuento, 0);
  if v_total < 0 then v_total := 0; end if;

  select mesa_id into v_mesa_id
  from public.comandas
  where id = p_comanda_id;

  for v_item in
    select ci.producto_id, ci.cantidad, p.nombre, p.stock
    from public.comanda_items ci
    join public.productos p on p.id = ci.producto_id
    where ci.comanda_id = p_comanda_id
  loop
    if v_item.stock >= v_item.cantidad then
      update public.productos
      set stock = stock - v_item.cantidad
      where id = v_item.producto_id;

      insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, comanda_id)
      values (v_item.producto_id, 'salida', v_item.cantidad, 'Venta - comanda #' || p_comanda_id, p_comanda_id);
    else
      alertas := array_append(alertas, format('Stock insuficiente de %s (disponible: %s, requerido: %s)', v_item.nombre, v_item.stock, v_item.cantidad));
    end if;
  end loop;

  update public.comandas
  set
    estado = 'pagada',
    fecha_cierre = now(),
    total = v_total,
    descuento = coalesce(p_descuento, 0),
    metodo_pago = p_metodo_pago
  where id = p_comanda_id;

  update public.mesas
  set estado = 'libre'
  where id = v_mesa_id;

  return jsonb_build_object(
    'success', true,
    'total', v_total,
    'alertas', alertas
  );
end;
$$;

-- ============================================================
-- 10. FUNCIÓN: AJUSTAR STOCK MANUAL (admin)
-- ============================================================
create or replace function public.ajustar_stock(
  p_producto_id uuid,
  p_cantidad numeric,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.productos
  set stock = stock + p_cantidad
  where id = p_producto_id;

  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo)
  values (
    p_producto_id,
    case when p_cantidad > 0 then 'entrada' else 'salida' end,
    abs(p_cantidad),
    p_motivo
  );
end;
$$;

-- ============================================================
-- 11. FUNCIÓN: REPORTE DE VENTAS
-- ============================================================
create or replace function public.reporte_ventas(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_mozo_id uuid default null,
  p_metodo_pago text default null
)
returns table(
  fecha date,
  comanda_id uuid,
  mozo text,
  mesa int,
  total numeric,
  descuento numeric,
  metodo_pago text,
  items_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    c.fecha_cierre::date as fecha,
    c.id as comanda_id,
    p.nombre as mozo,
    m.numero as mesa,
    c.total,
    c.descuento,
    c.metodo_pago,
    count(ci.id)::bigint as items_count
  from public.comandas c
  join public.perfiles p on p.id = c.mozo_id
  join public.mesas m on m.id = c.mesa_id
  left join public.comanda_items ci on ci.comanda_id = c.id
  where c.estado = 'pagada'
    and c.fecha_cierre between p_desde and p_hasta
    and (p_mozo_id is null or c.mozo_id = p_mozo_id)
    and (p_metodo_pago is null or c.metodo_pago = p_metodo_pago)
  group by c.fecha_cierre::date, c.id, p.nombre, m.numero, c.total, c.descuento, c.metodo_pago
  order by c.fecha_cierre desc;
$$;

-- ============================================================
-- 12. FUNCIÓN: PLATOS MÁS VENDIDOS
-- ============================================================
create or replace function public.platos_mas_vendidos(
  p_desde timestamptz default (now() - interval '30 days'),
  p_hasta timestamptz default now(),
  p_limite int default 10
)
returns table(
  producto_id uuid,
  nombre text,
  categoria text,
  total_vendido numeric,
  ingresos_generados numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.id as producto_id,
    p.nombre,
    p.categoria,
    sum(ci.cantidad) as total_vendido,
    sum(ci.cantidad * ci.precio_unitario) as ingresos_generados
  from public.comanda_items ci
  join public.comandas c on c.id = ci.comanda_id
  join public.productos p on p.id = ci.producto_id
  where c.estado = 'pagada'
    and c.fecha_cierre between p_desde and p_hasta
  group by p.id, p.nombre, p.categoria
  order by total_vendido desc
  limit p_limite;
$$;

-- ============================================================
-- 13. HABILITAR REALTIME (para cocina en tiempo real)
-- ============================================================
alter publication supabase_realtime add table public.comanda_items;
alter publication supabase_realtime add table public.comandas;
alter publication supabase_realtime add table public.mesas;

-- ============================================================
-- 14. POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (RLS)
-- ============================================================

alter table public.perfiles enable row level security;
alter table public.mesas enable row level security;
alter table public.productos enable row level security;
alter table public.comandas enable row level security;
alter table public.comanda_items enable row level security;
alter table public.movimientos_stock enable row level security;

create or replace function public.get_current_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- PERFILES
drop policy if exists "admin todo on perfiles" on public.perfiles;
drop policy if exists "usuarios ven su propio perfil" on public.perfiles;
create policy "admin todo on perfiles"
  on public.perfiles for all
  using (public.get_current_rol() = 'admin')
  with check (public.get_current_rol() = 'admin');

create policy "usuarios ven su propio perfil"
  on public.perfiles for select
  using (id = auth.uid());

-- MESAS
drop policy if exists "admin todo on mesas" on public.mesas;
drop policy if exists "mozo select mesas" on public.mesas;
drop policy if exists "mozo insert mesas" on public.mesas;
drop policy if exists "mozo update mesas" on public.mesas;
drop policy if exists "cocina select mesas" on public.mesas;
create policy "admin todo on mesas"
  on public.mesas for all
  using (public.get_current_rol() = 'admin')
  with check (public.get_current_rol() = 'admin');

create policy "mozo select mesas"
  on public.mesas for select
  using (public.get_current_rol() = 'mozo');

create policy "mozo insert mesas"
  on public.mesas for insert
  with check (public.get_current_rol() = 'mozo');

create policy "mozo update mesas"
  on public.mesas for update
  using (public.get_current_rol() = 'mozo')
  with check (public.get_current_rol() = 'mozo');

create policy "cocina select mesas"
  on public.mesas for select
  using (public.get_current_rol() = 'cocina');

-- PRODUCTOS
drop policy if exists "admin todo on productos" on public.productos;
drop policy if exists "mozo select productos activos" on public.productos;
drop policy if exists "cocina select productos comida" on public.productos;
create policy "admin todo on productos"
  on public.productos for all
  using (public.get_current_rol() = 'admin')
  with check (public.get_current_rol() = 'admin');

create policy "mozo select productos activos"
  on public.productos for select
  using (public.get_current_rol() = 'mozo' and activo = true);

create policy "cocina select productos comida"
  on public.productos for select
  using (public.get_current_rol() = 'cocina' and es_comida = true and activo = true);

-- COMANDAS
drop policy if exists "admin todo on comandas" on public.comandas;
drop policy if exists "mozo insert comandas" on public.comandas;
drop policy if exists "mozo select comandas" on public.comandas;
drop policy if exists "mozo update comandas" on public.comandas;
drop policy if exists "cocina select comandas" on public.comandas;
create policy "admin todo on comandas"
  on public.comandas for all
  using (public.get_current_rol() = 'admin')
  with check (public.get_current_rol() = 'admin');

create policy "mozo insert comandas"
  on public.comandas for insert
  with check (public.get_current_rol() = 'mozo' and mozo_id = auth.uid());

create policy "mozo select comandas"
  on public.comandas for select
  using (public.get_current_rol() = 'mozo' and mozo_id = auth.uid());

create policy "mozo update comandas"
  on public.comandas for update
  using (public.get_current_rol() = 'mozo' and mozo_id = auth.uid())
  with check (public.get_current_rol() = 'mozo' and mozo_id = auth.uid());

create policy "cocina select comandas"
  on public.comandas for select
  using (public.get_current_rol() = 'cocina');

-- COMANDA_ITEMS
drop policy if exists "admin todo on comanda_items" on public.comanda_items;
drop policy if exists "mozo insert comanda_items" on public.comanda_items;
drop policy if exists "mozo select comanda_items" on public.comanda_items;
drop policy if exists "mozo update comanda_items" on public.comanda_items;
drop policy if exists "cocina select comanda_items comida" on public.comanda_items;
drop policy if exists "cocina update estado_cocina" on public.comanda_items;
create policy "admin todo on comanda_items"
  on public.comanda_items for all
  using (public.get_current_rol() = 'admin')
  with check (public.get_current_rol() = 'admin');

create policy "mozo insert comanda_items"
  on public.comanda_items for insert
  with check (
    public.get_current_rol() = 'mozo'
    and exists (
      select 1 from public.comandas
      where id = comanda_id and mozo_id = auth.uid()
    )
  );

create policy "mozo select comanda_items"
  on public.comanda_items for select
  using (
    public.get_current_rol() = 'mozo'
    and exists (
      select 1 from public.comandas
      where id = comanda_id and mozo_id = auth.uid()
    )
  );

create policy "mozo update comanda_items"
  on public.comanda_items for update
  using (
    public.get_current_rol() = 'mozo'
    and exists (
      select 1 from public.comandas
      where id = comanda_id and mozo_id = auth.uid()
    )
  )
  with check (
    public.get_current_rol() = 'mozo'
    and exists (
      select 1 from public.comandas
      where id = comanda_id and mozo_id = auth.uid()
    )
  );

create policy "cocina select comanda_items comida"
  on public.comanda_items for select
  using (
    public.get_current_rol() = 'cocina'
    and exists (
      select 1 from public.productos
      where id = producto_id and es_comida = true
    )
  );

create policy "cocina update estado_cocina"
  on public.comanda_items for update
  using (
    public.get_current_rol() = 'cocina'
    and exists (
      select 1 from public.productos
      where id = producto_id and es_comida = true
    )
  )
  with check (
    public.get_current_rol() = 'cocina'
    and exists (
      select 1 from public.productos
      where id = producto_id and es_comida = true
    )
  );

-- MOVIMIENTOS_STOCK
drop policy if exists "admin todo on movimientos_stock" on public.movimientos_stock;
drop policy if exists "mozo select movimientos_stock" on public.movimientos_stock;
create policy "admin todo on movimientos_stock"
  on public.movimientos_stock for all
  using (public.get_current_rol() = 'admin')
  with check (public.get_current_rol() = 'admin');

create policy "mozo select movimientos_stock"
  on public.movimientos_stock for select
  using (public.get_current_rol() = 'mozo');

-- ============================================================
-- 15. LIMPIEZA DE SEGURIDAD Y REPARACIÓN DE PERFILES
-- ============================================================

-- Eliminar función is_admin insegura si existe
drop function if exists public.is_admin();

-- Insertar perfiles faltantes para usuarios que ya existían en auth.users
-- (evita el error "Database error creating new user" para usuarios previos)
insert into public.perfiles (id, nombre, rol)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'nombre', au.email),
  coalesce(au.raw_user_meta_data ->> 'rol', 'mozo')
from auth.users au
where not exists (select 1 from public.perfiles p where p.id = au.id);

