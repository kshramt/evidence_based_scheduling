use sqlx::postgres::PgQueryResult;

pub async fn fake_idp_create_user(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    id: &str,
    name: &str,
) -> sqlx::Result<PgQueryResult> {
    sqlx::query!(
        r#"
insert into
    app.fake_idp_users (id, name)
values
    ($1, $2)
;
"#,
        id,
        name,
    )
    .execute(&mut **tx)
    .await
}

pub struct FakeIdpGetUserByNameRow {
    pub id: String,
    pub name: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub async fn fake_idp_get_user_by_name(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    name: &str,
) -> sqlx::Result<FakeIdpGetUserByNameRow> {
    sqlx::query_as!(
        FakeIdpGetUserByNameRow,
        r#"
select
    *
from
    app.fake_idp_users
where
    name = $1
;
"#,
        name,
    )
    .fetch_one(&mut **tx)
    .await
}

pub struct RawCreateUserRow {
    pub id: String,
    pub head_client_id: i64,
    pub head_session_id: i64,
    pub head_patch_id: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub async fn raw_create_user(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    id: &str,
    head_client_id: i64,
    head_session_id: i64,
    head_patch_id: i64,
) -> sqlx::Result<RawCreateUserRow> {
    sqlx::query_as!(
        RawCreateUserRow,
        r#"
insert into
    app.users (
        id,
        head_client_id,
        head_session_id,
        head_patch_id
    )
values
    ($1, $2, $3, $4)
returning
    *
;
"#,
        id,
        head_client_id,
        head_session_id,
        head_patch_id,
    )
    .fetch_one(&mut **tx)
    .await
}

pub struct CreateSeqRow {
    pub user_id: String,
    pub last_value: i64,
}

pub async fn create_seq(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
) -> sqlx::Result<CreateSeqRow> {
    sqlx::query_as!(
        CreateSeqRow,
        r#"
insert into
    app.seqs (user_id)
values
    ($1)
returning
    *
;
"#,
        user_id,
    )
    .fetch_one(&mut **tx)
    .await
}

pub struct UpdateLastSeqValueRow {
    pub last_value: i64,
}

pub async fn update_last_seq_value(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    delta: i64,
) -> sqlx::Result<UpdateLastSeqValueRow> {
    sqlx::query_as!(
        UpdateLastSeqValueRow,
        r#"
update
    app.seqs
set
    last_value = last_value + $1
where
    user_id = $2
returning
    last_value
;
"#,
        delta,
        user_id,
    )
    .fetch_one(&mut **tx)
    .await
}

pub async fn create_client(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    client_id: i64,
    name: &str,
) -> sqlx::Result<PgQueryResult> {
    sqlx::query!(
        r#"
with
    new_client as (
        insert into
        app.clients (user_id, client_id, name)
        values
        ($1, $2, $3)
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
    and new_client.client_id != app.patches.client_id
;
"#,
        user_id,
        client_id,
        name,
    )
    .execute(&mut **tx)
    .await
}

pub struct Patch {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
    pub parent_client_id: i64,
    pub parent_session_id: i64,
    pub parent_patch_id: i64,
    pub patch: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn create_patches_for_user(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    patches: &[Patch],
) -> sqlx::Result<()> {
    for patch in patches.iter() {
        sqlx::query!(
            r#"
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
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict do nothing
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
    and app.clients.client_id != new_patches.client_id
;
"#,
            &user_id,
            &patch.client_id,
            &patch.session_id,
            &patch.patch_id,
            &patch.parent_client_id,
            &patch.parent_session_id,
            &patch.parent_patch_id,
            &patch.patch,
            &patch.created_at,
        )
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

pub struct GetPendingPatchesRow {
    pub user_id: String,
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
    pub parent_client_id: i64,
    pub parent_session_id: i64,
    pub parent_patch_id: i64,
    pub patch: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

pub async fn get_pending_patches(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    client_id: i64,
    size: i64,
) -> sqlx::Result<Vec<GetPendingPatchesRow>> {
    sqlx::query_as!(
        GetPendingPatchesRow,
        r#"
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
    pending_patches.user_id = $1
    and pending_patches.consumer_client_id = $2
limit
    $3
;
"#,
        user_id,
        client_id,
        size,
    )
    .fetch_all(&mut **tx)
    .await
}

pub struct PatchKey {
    pub client_id: i64,
    pub session_id: i64,
    pub patch_id: i64,
}

pub async fn delete_pending_patches(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    client_id: i64,
    patch_keys: &[PatchKey],
) -> sqlx::Result<()> {
    for patch_key in patch_keys.iter() {
        sqlx::query!(
            r#"
delete from
    app.pending_patches
where
    user_id = $1
    and consumer_client_id = $2
    and producer_client_id = $3
    and producer_session_id = $4
    and producer_patch_id = $5
;
"#,
            &user_id,
            &client_id,
            &patch_key.client_id,
            &patch_key.session_id,
            &patch_key.patch_id,
        )
        .execute(&mut **tx)
        .await?;
    }
    Ok(())
}

pub struct GetHeadRow {
    pub head_client_id: i64,
    pub head_session_id: i64,
    pub head_patch_id: i64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub name: String,
}

pub async fn get_head(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
) -> sqlx::Result<GetHeadRow> {
    sqlx::query_as!(
        GetHeadRow,
        r#"
select
    u.head_client_id,
    u.head_session_id,
    u.head_patch_id,
    p.created_at,
    c.name
from
    app.users u,
    app.patches p,
    app.clients c
where
    u.id = $1
    and p.user_id = $1
    and p.client_id = u.head_client_id
    and p.session_id = u.head_session_id
    and p.patch_id = u.head_patch_id
    and c.user_id = $1
    and c.client_id = u.head_client_id;
"#,
        &user_id
    )
    .fetch_one(&mut **tx)
    .await
}

#[allow(clippy::too_many_arguments)]
pub async fn update_head_if_not_modified(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    client_id: i64,
    session_id: i64,
    patch_id: i64,
    prev_client_id: i64,
    prev_session_id: i64,
    prev_patch_id: i64,
) -> sqlx::Result<PgQueryResult> {
    sqlx::query!(
        r#"
update
    app.users
set
    head_client_id = $2,
    head_session_id = $3,
    head_patch_id = $4
where
    id = $1
    and head_client_id = $5
    and head_session_id = $6
    and head_patch_id = $7
;
"#,
        user_id,
        client_id,
        session_id,
        patch_id,
        prev_client_id,
        prev_session_id,
        prev_patch_id,
    )
    .execute(&mut **tx)
    .await
}

pub async fn update_head(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    user_id: &str,
    client_id: i64,
    session_id: i64,
    patch_id: i64,
) -> sqlx::Result<PgQueryResult> {
    sqlx::query!(
        r#"
update
    app.users
set
    head_client_id = $2,
    head_session_id = $3,
    head_patch_id = $4
where
    id = $1
"#,
        user_id,
        client_id,
        session_id,
        patch_id,
    )
    .execute(&mut **tx)
    .await
}
