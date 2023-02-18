-- migrate:up
grant all on schema public to postgres;
revoke all on schema public from public;

create schema app;

create role app_rw;
grant connect on database postgres to app_rw;
grant usage, create on schema app to app_rw;
grant select, insert, update, delete on all tables in schema app to app_rw;
alter default privileges in schema app grant select,
insert,
update,
delete on tables to app_rw;
alter default privileges in schema app grant usage on sequences to app_rw;

create user app with password '@APP_USER_PASSWORD@';
grant app_rw to app;

-- migrate:down
