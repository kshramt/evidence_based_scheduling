import * as Pb from "./api_v1_grpc/api_v1_pb";

export const decode_GetHeadResp = (resp: Pb.GetHeadResp) => {
  if (resp.clientId === undefined) {
    throw new Error("client_id is not set");
  }
  if (resp.sessionId === undefined) {
    throw new Error("session_id is not set");
  }
  if (resp.patchId === undefined) {
    throw new Error("patch_id is not set");
  }
  if (resp.createdAt === undefined) {
    throw new Error("created_at is not set");
  }
  if (resp.name === undefined) {
    throw new Error("name is not set");
  }
  return {
    client_id: Number(resp.clientId),
    session_id: Number(resp.sessionId),
    patch_id: Number(resp.patchId),
    created_at: resp.createdAt.toDate(),
    name: resp.name,
  };
};
