import { expect, test } from "vitest";
import {
  add_action,
  show_path_to_selected_node,
  toggle_show_children,
} from "./actions";
import { BiGramPredictor, TriGramPredictor } from "./next_action_predictor";
import { emptyStateOf, keys_of } from "./ops";
import { getRootReducer } from "./reducers";
import type { TNodeId } from "./types";

test("opening a path leaves visible edges and their parent counts alone", () => {
  const initial = emptyStateOf();
  const root = initial.data.root;
  const reduce = getRootReducer(
    initial,
    new BiGramPredictor<TNodeId>(0.9),
    new TriGramPredictor<TNodeId>(0.9),
    10,
  );
  const withParent = reduce(
    initial,
    add_action({ node_id: root, show_mobile: false }),
  );
  const parent = keys_of(withParent.data.queue)[0];
  const state = reduce(
    withParent,
    add_action({ node_id: parent, show_mobile: false }),
  );
  const child = keys_of(state.data.nodes).find(
    (id) => id !== root && id !== parent,
  );
  if (child === undefined) throw new Error("Expected child task");
  const edge = keys_of(state.data.nodes[child].parents)[0];

  expect(reduce(state, show_path_to_selected_node(child))).toBe(state);
  const collapsed = reduce(state, toggle_show_children(parent));
  expect(collapsed.data.edges[edge].hide).toBe(true);
  expect(collapsed.swapped_caches.n_hidden_child_edges?.[parent]).toBe(1);

  const reopened = reduce(collapsed, show_path_to_selected_node(child));
  expect(reopened.data.edges[edge].hide).toBeUndefined();
  expect(reopened.swapped_caches.n_hidden_child_edges?.[parent]).toBe(0);
  expect(reopened.swapped_caches.n_hidden_child_edges?.[root]).toBe(0);
  expect(reduce(reopened, show_path_to_selected_node(child))).toBe(reopened);
});
