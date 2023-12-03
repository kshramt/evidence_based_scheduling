import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

const SysHealthResponse = z.object({ status: z.string() }).passthrough();
const FakeIdpCreateUserRequest = z.object({ name: z.string() }).passthrough();
const IdToken = z.object({ user_id: z.string() }).passthrough();
const FakeIdpCreateUserResponse = z.object({ id_token: IdToken }).passthrough();
const FakeIdpCreateIdTokenResponse = z
  .object({ id_token: IdToken })
  .passthrough();
const CreateUserRequest = z.object({}).partial().passthrough();
const CreateUserResponse = z.object({}).partial().passthrough();
const CreateClientRequest = z.object({ name: z.string() }).passthrough();
const CreateClientResponse = z
  .object({ client_id: z.number().int() })
  .passthrough();
const PatchKey = z
  .object({
    client_id: z.number().int(),
    session_id: z.number().int(),
    patch_id: z.number().int(),
  })
  .passthrough();
const Patch = z
  .object({
    patch_key: PatchKey,
    parent_patch_key: PatchKey,
    created_at: z.string().datetime({ offset: true }),
    patch: z.unknown(),
  })
  .passthrough();
const CreatePatchesRequest = z
  .object({ patches: z.array(Patch) })
  .passthrough();
const CreatePatchesResponse = z.object({}).partial().passthrough();
const GetPendingPatchesResponse = z
  .object({ patches: z.array(Patch) })
  .passthrough();
const DeletePendingPatchesRequest = z
  .object({ patch_keys: z.array(PatchKey) })
  .passthrough();
const DeletePendingPatchesResponse = z.object({}).partial().passthrough();
const GetHeadResponse = z
  .object({
    client_id: z.number().int(),
    session_id: z.number().int(),
    patch_id: z.number().int(),
    created_at: z.string().datetime({ offset: true }),
    name: z.string(),
  })
  .passthrough();
const UpdateHeadRequest = z
  .object({ patch_key: PatchKey, header_if_match: PatchKey.optional() })
  .passthrough();
const UpdateHeadResponse = z.object({ updated: z.boolean() }).passthrough();

export const schemas = {
  SysHealthResponse,
  FakeIdpCreateUserRequest,
  IdToken,
  FakeIdpCreateUserResponse,
  FakeIdpCreateIdTokenResponse,
  CreateUserRequest,
  CreateUserResponse,
  CreateClientRequest,
  CreateClientResponse,
  PatchKey,
  Patch,
  CreatePatchesRequest,
  CreatePatchesResponse,
  GetPendingPatchesResponse,
  DeletePendingPatchesRequest,
  DeletePendingPatchesResponse,
  GetHeadResponse,
  UpdateHeadRequest,
  UpdateHeadResponse,
};

const endpoints = makeApi([
  {
    method: "post",
    path: "/fake_idp/login/id_token",
    alias: "postFake_idploginid_token",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string() }).passthrough(),
      },
    ],
    response: FakeIdpCreateIdTokenResponse,
  },
  {
    method: "post",
    path: "/fake_idp/users",
    alias: "postFake_idpusers",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string() }).passthrough(),
      },
    ],
    response: FakeIdpCreateUserResponse,
  },
  {
    method: "get",
    path: "/sys/health",
    alias: "getSyshealth",
    requestFormat: "json",
    response: z.object({ status: z.string() }).passthrough(),
  },
  {
    method: "post",
    path: "/users",
    alias: "postUsers",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "post",
    path: "/users/:user_id/clients",
    alias: "postUsersUser_idclients",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ name: z.string() }).passthrough(),
      },
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({ client_id: z.number().int() }).passthrough(),
  },
  {
    method: "get",
    path: "/users/:user_id/clients/:client_id/pending_patches",
    alias: "getUsersUser_idclientsClient_idpending_patches",
    requestFormat: "json",
    parameters: [
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "client_id",
        type: "Path",
        schema: z.number().int(),
      },
      {
        name: "limit",
        type: "Query",
        schema: z.number().int(),
      },
    ],
    response: GetPendingPatchesResponse,
  },
  {
    method: "delete",
    path: "/users/:user_id/clients/:client_id/pending_patches~batch",
    alias: "deleteUsersUser_idclientsClient_idpending_patches_batch",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: DeletePendingPatchesRequest,
      },
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "client_id",
        type: "Path",
        schema: z.number().int(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
  {
    method: "get",
    path: "/users/:user_id/head",
    alias: "getUsersUser_idhead",
    requestFormat: "json",
    parameters: [
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GetHeadResponse,
  },
  {
    method: "put",
    path: "/users/:user_id/head",
    alias: "putUsersUser_idhead",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: UpdateHeadRequest,
      },
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({ updated: z.boolean() }).passthrough(),
  },
  {
    method: "post",
    path: "/users/:user_id/patches~batch",
    alias: "postUsersUser_idpatches_batch",
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: CreatePatchesRequest,
      },
      {
        name: "user_id",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
