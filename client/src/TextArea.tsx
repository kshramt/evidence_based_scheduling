import * as React from "react";
import { useStore } from "react-redux";

import AutoHeightTextArea from "./AutoHeightTextArea";
import * as actions from "./actions";
import { useSelector } from "./types";
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
  const store = useStore<types.TState>();
  const onBlur = React.useMemo(() => {
    const _onBlur = props.onBlur;
    return (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (_onBlur !== undefined) {
        _onBlur(e);
      }

      const savedText = store.getState().swapped_caches.text?.[props.node_id];
      const editedText = e.currentTarget.value;
      if (savedText !== undefined && savedText !== editedText) {
        store.dispatch(
          actions.set_text_action({ k: props.node_id, text: editedText }),
        );
      }
    };
  }, [store, props.node_id, props.onBlur]);

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
