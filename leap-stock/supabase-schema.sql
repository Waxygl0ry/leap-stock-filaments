-- À coller dans Supabase > SQL Editor > New query, puis "Run".

create table if not exists bobines (
  id uuid primary key default gen_random_uuid(),
  marque text not null,
  materiau text not null,
  couleur_nom text not null,
  couleur_hex text not null default '#2C5F8A',
  poids_initial numeric not null,
  poids_restant numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists usages (
  id uuid primary key default gen_random_uuid(),
  bobine_id uuid references bobines(id) on delete set null,
  membre text not null,
  impression text not null,
  grammes numeric not null,
  date timestamptz not null default now()
);

-- Active la sécurité au niveau des lignes puis autorise un accès public en lecture/écriture.
-- C'est volontairement ouvert (pas de compte requis) pour un outil interne d'asso.
-- Si vous voulez restreindre l'accès plus tard, remplacez ces policies par des règles liées à
-- Supabase Auth.
alter table bobines enable row level security;
alter table usages enable row level security;

create policy "public read bobines" on bobines for select using (true);
create policy "public write bobines" on bobines for insert with check (true);
create policy "public update bobines" on bobines for update using (true);
create policy "public delete bobines" on bobines for delete using (true);

create policy "public read usages" on usages for select using (true);
create policy "public write usages" on usages for insert with check (true);

-- Active le "Realtime" (mise à jour live pour tout le monde) sur les deux tables.
alter publication supabase_realtime add table bobines;
alter publication supabase_realtime add table usages;
