import * as Pb from "./api_v1_grpc/api_v1_pb";

export const decode_GetHeadResp = (resp: Pb.GetHeadResp) => {
  if (!resp.hasClientId()) {
    throw new Error("client_id is not set");
  }
  if (!resp.hasSessionId()) {
    throw new Error("session_id is not set");
  }
  if (!resp.hasPatchId()) {
    throw new Error("patch_id is not set");
  }
  if (!resp.hasCreatedAt()) {
    throw new Error("created_at is not set");
  }
  if (!resp.hasName()) {
    throw new Error("name is not set");
  }
  return {
    client_id: resp.getClientId(),
    session_id: resp.getSessionId(),
    patch_id: resp.getPatchId(),
    created_at: resp.getCreatedAt()!.toDate(),
    name: resp.getName(),
  };
};
