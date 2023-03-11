-- name: FakeIdpCreateUser :exec
insert into
  app.fake_idp_users (id, name)
values
  (@id, @name);

-- name: FakeIdpGetUserByName :one
select
  *
from
  app.fake_idp_users
where
  name = @name;

-- name: RawCreateUser :one
insert into
  app.users (
    id,
    leaf_client_id,
    leaf_session_id,
    leaf_patch_id
  )
values
  (
    @id,
    @leaf_client_id,
    @leaf_session_id,
    @leaf_patch_id
  )
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
    consumer_client_id,
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
      app.patches (
        user_id,
        client_id,
        session_id,
        patch_id,
        parent_client_id,
        parent_session_id,
        parent_patch_id,
        patch,
        created_at
      )
    values
      (
        unnest(@user_ids::text[]),
        unnest(@client_ids::bigint[]),
        unnest(@session_ids::bigint[]),
        unnest(@patch_ids::bigint[]),
        unnest(@parent_client_ids::bigint[]),
        unnest(@parent_session_ids::bigint[]),
        unnest(@parent_patch_ids::bigint[]),
        unnest(@patches::jsonb[]),
        unnest(@created_ats::timestamp with time zone [])
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

-- name: GetPendingPatches :many
select
  patches.user_id,
  patches.client_id,
  patches.session_id,
  patches.patch_id,
  patches.parent_client_id,
  patches.parent_session_id,
  patches.parent_patch_id,
  patches.patch,
  patches.created_at
from
  app.pending_patches pending_patches
  inner join app.patches patches on pending_patches.user_id = patches.user_id
  and pending_patches.producer_client_id = patches.client_id
  and pending_patches.producer_session_id = patches.session_id
  and pending_patches.producer_patch_id = patches.patch_id
where
  pending_patches.user_id = @user_id
  and pending_patches.consumer_client_id = @client_id
limit
  @limit_::bigint;

-- name: DeletePendingPatches :exec
delete from app.pending_patches
where
  (
    user_id,
    consumer_client_id,
    producer_client_id,
    producer_session_id,
    producer_patch_id
  ) in (
    select
      unnest(@user_ids::text[]),
      unnest(@client_ids::bigint[]),
      unnest(@producer_client_ids::bigint[]),
      unnest(@producer_session_ids::bigint[]),
      unnest(@producer_patch_ids::bigint[])
  );

-- name: GetCurrentPatchId :one
select
  leaf_client_id,
  leaf_session_id,
  leaf_patch_id
from
  app.users
where
  id = @id;

-- name: UpdateCurrentPatchIdIfNotModified :execrows
update app.users
set
  leaf_client_id = @client_id,
  leaf_session_id = @session_id,
  leaf_patch_id = @patch_id
where
  id = @user_id
  and leaf_client_id = @prev_client_id
  and leaf_session_id = @prev_session_id
  and leaf_patch_id = @prev_patch_id;
