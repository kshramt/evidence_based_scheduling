-- name: RawCreateUser :one
insert into
  app.users (id)
values
  (@id)
returning
  *;

-- name: CreateSeq :one
insert into
  app.seqs (user_id)
values
  (@user_id)
returning
  *;

-- name: LastSeqValue :one
update app.seqs
set
  last_value = last_value + @delta
where
  user_id = @user_id
returning
  last_value;

-- name: CreateClient :exec
with
  new_client as (
    insert into
      app.clients (user_id, client_id, name)
    values
      (@user_id, @client_id, @name)
    returning
      user_id,
      client_id
  )
insert into
  app.pending_patches (
    user_id,
    client_id,
    producer_client_id,
    producer_session_id,
    producer_patch_id
  )
select
  new_client.user_id,
  new_client.client_id,
  app.patches.client_id,
  app.patches.session_id,
  app.patches.patch_id
from
  new_client
  inner join app.patches on new_client.user_id = app.patches.user_id
  and new_client.client_id != 0
  and new_client.client_id != app.patches.client_id;

-- name: CreatePatches :exec
with
  new_patches as (
    insert into
      app.patches (user_id, client_id, session_id, patch_id, patch)
    values
      (
        unnest(@user_ids::text[]),
        unnest(@client_ids::bigint[]),
        unnest(@session_ids::bigint[]),
        unnest(@patch_ids::bigint[]),
        unnest(@patches::jsonb[])
      )
    returning
      user_id,
      client_id,
      session_id,
      patch_id
  )
insert into
  app.pending_patches (
    user_id,
    consumer_client_id,
    producer_client_id,
    producer_session_id,
    producer_patch_id
  )
select
  app.clients.user_id,
  app.clients.client_id,
  new_patches.client_id,
  new_patches.session_id,
  new_patches.patch_id
from
  app.clients
  inner join new_patches on app.clients.user_id = new_patches.user_id
  and app.clients.client_id != 0
  and app.clients.client_id != new_patches.client_id;
