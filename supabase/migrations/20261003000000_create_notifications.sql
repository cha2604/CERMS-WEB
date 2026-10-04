-- Notifications for residents.
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id uuid,
  title text not null,
  message text not null,
  type text not null default 'status_update',
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_feed_idx
  on public.notifications (user_id, is_read, created_at desc);

comment on table public.notifications is
  'Resident notifications. Created automatically when a report changes.';

alter table public.notifications enable row level security;

drop policy if exists "Residents read own notifications" on public.notifications;

create policy "Residents read own notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Residents mark own notifications read" on public.notifications;

create policy "Residents mark own notifications read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins insert notifications" on public.notifications;

create policy "Admins insert notifications"
  on public.notifications
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

drop policy if exists "Admins read all notifications" on public.notifications;

create policy "Admins read all notifications"
  on public.notifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'admin'
    )
  );

-- Fires on every change to a resident's report so the resident is always notified,
-- no matter which admin screen performed the update.
create or replace function public.notify_resident_of_report_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_title text;
  v_message text;
  v_old_status text;
  v_new_status text;
begin
  v_user_id := new.user_id;

  -- OLD is unassigned on INSERT, so the insert case must be handled first.
  if tg_op = 'INSERT' then
    v_title := 'Report received';
    v_message := 'Your report "' || coalesce(new.title, 'Untitled report')
      || '" has been submitted and is waiting for review.';

  else
    v_old_status := old.status;
    v_new_status := new.status;

    if coalesce(v_old_status, '') is distinct from coalesce(v_new_status, '') then
      v_title := 'Report status updated';
      v_message := 'Your report "' || coalesce(new.title, 'Untitled report')
        || '" is now ' || coalesce(v_new_status, 'updated') || '.';

      if v_new_status = 'Rejected'
        and nullif(btrim(coalesce(new.rejection_reason, '')), '') is not null then
        v_message := v_message || ' Reason: ' || btrim(new.rejection_reason) || '.';
      elsif nullif(btrim(coalesce(new.remarks, '')), '') is not null then
        v_message := v_message || ' Remarks: ' || btrim(new.remarks) || '.';
      end if;

    elsif coalesce(new.remarks, '') is distinct from coalesce(old.remarks, '')
      or coalesce(new.rejection_reason, '') is distinct from coalesce(old.rejection_reason, '') then
      v_title := 'Report updated';
      v_message := 'There is new information from the barangay office on your report "'
        || coalesce(new.title, 'Untitled report') || '".';

    else
      return new;
    end if;
  end if;

  if v_user_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, report_id, title, message, type, link_url)
  values (
    v_user_id,
    new.id,
    v_title,
    v_message,
    'status_update',
    '/report/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists reports_notify_resident on public.reports;

create trigger reports_notify_resident
  after insert or update of status, remarks, rejection_reason on public.reports
  for each row
  execute function public.notify_resident_of_report_change();

-- Notifies the resident when a response team is assigned to their report.
create or replace function public.notify_resident_of_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select r.user_id
  into v_user_id
  from public.reports r
  where r.id = new.report_id;

  if v_user_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, report_id, title, message, type, link_url)
  values (
    v_user_id,
    new.report_id,
    'Response team assigned',
    'A response team (' || coalesce(new.team_name, 'assigned team')
      || ') is now handling your report.',
    'status_update',
    '/report/' || new.report_id::text
  );

  return new;
end;
$$;

drop trigger if exists report_assignments_notify_resident on public.report_assignments;

create trigger report_assignments_notify_resident
  after insert or update of team_name, personnel_name on public.report_assignments
  for each row
  execute function public.notify_resident_of_assignment();

-- Push new notifications to the resident without a page refresh.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    )
  then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- Self-check: run this last statement on its own and confirm you get rows.
select
  n.id,
  n.title,
  n.message,
  n.type,
  n.link_url,
  n.is_read,
  n.created_at
from public.notifications n
order by n.created_at desc
limit 10;
