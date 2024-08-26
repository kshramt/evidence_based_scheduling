import * as React from "react";

import { AddButton } from "./AddButton";
import { DoneOrDontToTodoButton } from "./DoneOrDontToTodoButton";
import { EvalButton } from "./EvalButton";
import { ShowDetailsButton } from "./ShowDetailsButton";
import { StartOrStopButtons } from "./StartOrStopButtons";
import { TodoToDoneButton } from "./TodoToDoneButton";
import { TodoToDontButton } from "./TodoToDontButton";
import TopButton from "./TopButton";

import { useDispatch, useSelector } from "./types";
import * as actions from "./actions";
import * as consts from "./consts";
import * as types from "./types";
import * as utils from "./utils";
import CopyNodeIdButton from "./CopyNodeIdButton";

export const EntryButtons = (props: {
  node_id: types.TNodeId;
  jumpButton: React.ReactNode;
  prefix?: string;
}) => {
  const status = utils.assertV(
    useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
  );

  const root = useSelector((state) => state.data.root);
  const is_root = props.node_id === root;
  const is_todo = status === "todo";

  return (
    <div className="flex w-fit gap-x-[0.25em] items-baseline pt-[0.25em] content-visibility-auto">
      <CopyNodeIdButton node_id={props.node_id} />
      {is_root || !is_todo || <StartOrStopButtons node_id={props.node_id} />}
      {is_root || !is_todo || <TodoToDoneButton node_id={props.node_id} />}
      {is_root || !is_todo || <TodoToDontButton node_id={props.node_id} />}
      {is_root || is_todo || <DoneOrDontToTodoButton node_id={props.node_id} />}
      {is_todo && <EvalButton node_id={props.node_id} />}
      {is_root || !is_todo || <TopButton node_id={props.node_id} />}
      {is_root || !is_todo || <MoveUpButton node_id={props.node_id} />}
      {is_root || !is_todo || <MoveDownButton node_id={props.node_id} />}
      {/* <DeleteButton node_id={props.node_id} /> */}
      {is_todo && <AddButton node_id={props.node_id} prefix={props.prefix} />}
      <ShowDetailsButton node_id={props.node_id} />
      {props.jumpButton}
    </div>
  );
};

const MoveUpButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.moveUp_(props.node_id));
    doFocusMoveUpButton(props.node_id);
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      ref={moveUpButtonRefOf(props.node_id)}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.MOVE_UP_MARK}
    </button>
  );
};

const MoveDownButton = (props: { node_id: types.TNodeId }) => {
  const dispatch = useDispatch();
  const on_click = React.useCallback(() => {
    dispatch(actions.moveDown_(props.node_id));
    doFocusMoveDownButton(props.node_id);
  }, [props.node_id, dispatch]);

  return (
    <button
      className="btn-icon"
      onClick={on_click}
      ref={moveDownButtonRefOf(props.node_id)}
      onDoubleClick={utils.prevent_propagation}
    >
      {consts.MOVE_DOWN_MARK}
    </button>
  );
};

const doFocusMoveUpButton = (node_id: types.TNodeId) => {
  setTimeout(() => utils.focus(moveUpButtonRefOf(node_id).current), 100);
};

const doFocusMoveDownButton = (node_id: types.TNodeId) => {
  setTimeout(() => utils.focus(moveDownButtonRefOf(node_id).current), 100);
};

const moveUpButtonRefOf = utils.memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);

const moveDownButtonRefOf = utils.memoize1((_: types.TNodeId) =>
  React.createRef<HTMLButtonElement>(),
);
