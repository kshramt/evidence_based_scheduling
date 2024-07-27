import * as React from "react";

import AutoHeightTextArea from "./AutoHeightTextArea";
import * as actions from "./actions";
import { useDispatch, useSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const TextArea = (props: {
  node_id: types.TNodeId;
  className: string;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  id?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) => {
  const text = utils.assertV(
    useSelector((state) => state.swapped_caches.text?.[props.node_id]),
  );
  const dispatch = useDispatch();
  const onBlur = () => {
    const _onBlur = props.onBlur;
    return (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (_onBlur !== undefined) {
        _onBlur(e);
      }

      // Set text.
      const el = e.target;
      dispatch(
        actions.set_text_action({
          k: props.node_id,
          text: el.value,
        }),
      );
    };
  };

  return (
    <AutoHeightTextArea
      text={text}
      className={props.className}
      onBlur={onBlur}
      onClick={props.onClick}
      id={props.id}
      onKeyDown={props.onKeyDown}
    />
  );
};
