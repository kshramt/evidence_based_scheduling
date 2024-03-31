import * as React from "react";

import CopyNodeIdButton from "./CopyNodeIdButton";
import { EntryButtons } from "./EntryButtons";
import { EntryInfos } from "./EntryInfos";
import { EvalButton } from "./EvalButton";
import { EntryWrapper } from "./EntryWrapper";
import { ShowDetailsButton } from "./ShowDetailsButton";
import { StartOrStopButtons } from "./StartOrStopButtons";
import { TextArea } from "./TextArea";
import { TodoToDoneButton } from "./TodoToDoneButton";
import { TodoToDontButton } from "./TodoToDontButton";

import * as consts from "./consts";
import * as hooks from "./hooks";
import { useSelector, useRawSelector } from "./types";
import * as types from "./types";
import * as utils from "./utils";

export const QueueEntry = React.memo(
  (props: { node_id: types.TNodeId; index: number }) => {
    const exists = useRawSelector((state) =>
      Object.hasOwn(state.data.nodes, props.node_id),
    );
    return exists ? (
      <_QueueEntry node_id={props.node_id} index={props.index} />
    ) : (
      <div className="w-[1px] h-[1px]" /> // `null` is not allowed as Virtuoso does not allow 0-height elements.
    );
  },
);

const _QueueEntry = React.memo(
  (props: { node_id: types.TNodeId; index: number }) => {
    const isTodo =
      utils.assertV(
        useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
      ) === "todo";

    return isTodo ? (
      <TodoQueueEntry node_id={props.node_id} index={props.index} />
    ) : (
      <NonTodoQueueEntry node_id={props.node_id} index={props.index} />
    );
  },
);

const NonTodoQueueEntry = React.memo(
  (props: { node_id: types.TNodeId; index: number }) => {
    const status = utils.assertV(
      useSelector((state) => state.swapped_nodes.status?.[props.node_id]),
    );
    const to_tree = utils.useToTree(props.node_id);
    const handleKeyDown = hooks.useTaskShortcutKeys(
      props.node_id,
      consts.TREE_PREFIX,
    );
    const id = utils.queue_textarea_id_of(props.node_id);

    return (
      <EntryWrapper node_id={props.node_id} component="div">
        <div className="flex items-end w-fit">
          {props.index}
          <button onClick={to_tree}>←</button>
          <CopyNodeIdButton node_id={props.node_id} />
          <TextArea
            node_id={props.node_id}
            id={id}
            className={utils.join(
              "w-[29em] px-[0.75em] py-[0.5em]",
              status === "done"
                ? "text-red-600 dark:text-red-400"
                : status === "dont"
                  ? "text-neutral-500"
                  : null,
            )}
            onKeyDown={handleKeyDown}
          />
          <EntryInfos node_id={props.node_id} />
        </div>
        <EntryButtons node_id={props.node_id} />
      </EntryWrapper>
    );
  },
);

const TodoQueueEntry = React.memo(
  (props: { node_id: types.TNodeId; index: number }) => {
    const leaf_estimates_sum = utils.assertV(
      useSelector(
        (state) => state.swapped_caches.leaf_estimates_sum?.[props.node_id],
      ),
    );
    const percentiles = utils.assertV(
      useSelector((state) => state.swapped_caches.percentiles?.[props.node_id]),
    );
    const text = utils.assertV(
      useSelector((state) => state.swapped_caches.text?.[props.node_id]),
    );
    const toTree = utils.useToTree(props.node_id);
    const isRunning = utils.useIsRunning(props.node_id);

    return (
      <>
        <div
          className={utils.join(
            "flex items-baseline gap-x-[0.25em] pb-[0.125em] w-[51em]",
            isRunning && "running",
          )}
        >
          <div className="flex items-baseline gap-x-[0.25em] w-[22em]">
            <span className="w-[5em] text-right">{props.index}</span>
            <EvalButton node_id={props.node_id} />
            <TodoToDoneButton node_id={props.node_id} />
            <TodoToDontButton node_id={props.node_id} />
            <ShowDetailsButton node_id={props.node_id} />
            <CopyNodeIdButton node_id={props.node_id} />
            <StartOrStopButtons node_id={props.node_id} />
          </div>
          <span
            className="w-[16em] inline-block whitespace-nowrap overflow-hidden cursor-pointer"
            title={text}
            onClick={toTree}
            role="button"
            tabIndex={0}
          >
            {text}
          </span>
          <EntryInfos node_id={props.node_id} />
        </div>
        <div>
          {0 <= leaf_estimates_sum && utils.digits1(leaf_estimates_sum) + " | "}
          {percentiles.map(utils.digits1).join(", ")}
        </div>
      </>
    );
  },
);
