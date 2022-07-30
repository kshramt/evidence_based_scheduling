import * as immer from "immer";

import * as client from "./client";
import * as rate_limit from "./rate_limit";
import * as types from "./types";

let PARENT_ID = -1;
let ORIGIN_ID = -1;

const push_patches_queue = rate_limit.rate_limit_of();
const push_data_id_queue = rate_limit.rate_limit_of();

export const set_parent_id = (parent_id: number) => {
  PARENT_ID = parent_id;
};
export const set_origin_id = (origin_id: number) => {
  ORIGIN_ID = origin_id;
};

export const push_patches = (user_id: number, patches: immer.Patch[]) => {
  patches = patches.filter((patch) => patch.path[0] === "data");
  if (!patches.length) {
    return;
  }
  push_patches_queue(
    post_patches_of(
      user_id,
      JSON.stringify(
        patches
          .filter((patch) => patch.path[0] === "data")
          .map((patch) => {
            return { ...patch, path: "/" + patch.path.join("/") };
          }),
      ),
    ),
  );
};

export const patch_saver_of = (
  reducer_with_patches: (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    state: types.IState;
    patches: immer.Patch[];
    reverse_patches: immer.Patch[];
  },
  user_id: number,
) => {
  const patch_saver = (
    state: undefined | types.IState,
    action: types.TAnyPayloadAction,
  ) => {
    if (state === undefined) {
      return reducer_with_patches(state, action);
    }
    const reduced = reducer_with_patches(state, action);
    push_patches(user_id, reduced.patches);
    return reduced;
  };
  return patch_saver;
};

const post_patches_of = (user_id: number, patch: string) => {
  const post_patches = async () => {
    let res;
    try {
      res = await client.client.createPatchPatchesPost({
        hBEmptyHeaderPatchCreate: {
          header: {},
          body: { parent_id: PARENT_ID, user_id, patch },
        },
      });
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
    set_parent_id(res.header.etag);
    push_data_id_queue(post_data_id_of(user_id));
    return true;
  };
  return post_patches;
};

const post_data_id_of = (user_id: number) => {
  const post_data_id = async () => {
    if (ORIGIN_ID === PARENT_ID) {
      return true;
    }
    let res;
    try {
      res = await client.client.putIdOfDataOfUserUsersUserIdDataIdPut({
        userId: user_id,
        hBUnionIfMatchHeaderEmptyHeaderIntValue: {
          header: { if_match: ORIGIN_ID },
          body: { value: PARENT_ID },
        },
      });
    } catch (e: unknown) {
      console.error(e);
      return false;
    }
    set_origin_id(res.header.etag);
    return true;
  };
  return post_data_id;
};
