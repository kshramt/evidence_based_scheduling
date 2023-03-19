-- migrate:up
create table
  app.fake_idp_users (
    id text primary key,
    name text unique not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
  );

create function app.update_updated_at_column () returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table
  app.users (
    id text primary key,
    head_client_id bigint not null,
    head_session_id bigint not null,
    head_patch_id bigint not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
  );

create trigger users_updated_at_trigger before
update on app.users for each row
execute function app.update_updated_at_column ();

-- I do not want to update `users.updated_at` on every sequence increment.
create table
  app.seqs (
    user_id text primary key references app.users (id),
    last_value bigint not null default 0
  );

create table
  app.clients (
    user_id text not null references app.users (id),
    client_id bigint not null,
    name text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    primary key (user_id, client_id)
  );

create index clients_user_id_idx on app.clients (user_id);

create table
  app.patches (
    user_id text not null references app.users (id),
    client_id bigint not null,
    session_id bigint not null,
    patch_id bigint not null,
    parent_client_id bigint not null,
    parent_session_id bigint not null,
    parent_patch_id bigint not null,
    patch jsonb not null,
    created_at timestamp with time zone not null,
    uploaded_at timestamp with time zone not null default now(),
    foreign key (user_id, client_id) references app.clients (user_id, client_id) match full,
    foreign key (
      user_id,
      parent_client_id,
      parent_session_id,
      parent_patch_id
    ) references app.patches (user_id, client_id, session_id, patch_id) match full,
    primary key (user_id, client_id, session_id, patch_id)
  );

alter table app.users
add constraint fk_head_patch foreign key (
  id,
  head_client_id,
  head_session_id,
  head_patch_id
) references app.patches (user_id, client_id, session_id, patch_id) match full deferrable initially deferred;

create table
  app.pending_patches (
    user_id text not null references app.users (id),
    consumer_client_id bigint not null,
    producer_client_id bigint not null,
    producer_session_id bigint not null,
    producer_patch_id bigint not null,
    created_at timestamp with time zone not null default now(),
    foreign key (user_id, consumer_client_id) references app.clients (user_id, client_id) match full,
    foreign key (user_id, producer_client_id) references app.clients (user_id, client_id) match full,
    foreign key (
      user_id,
      producer_client_id,
      producer_session_id,
      producer_patch_id
    ) references app.patches (user_id, client_id, session_id, patch_id) match full,
    primary key (
      user_id,
      consumer_client_id,
      producer_client_id,
      producer_session_id,
      producer_patch_id
    )
  );

-- migrate:down
