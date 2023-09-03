import * as Jotai from "jotai";
import * as React from "react";
import * as RWindow from "react-window";

import * as consts from "src/consts";
import * as intervals from "src/intervals";
import * as ops from "src/ops";
import * as states from "src/states";
import * as utils from "src/utils";
import * as times from "src/times";
import * as types from "src/types";

const START_TIME = { f: Number(consts.WEEK_0_BEGIN) };
const END_TIME = { f: Number(new Date("2100-01-01T00:00:00Z")) };

const DISABLE_SCROLLING_STYLE = { overflow: "hidden" };

const useGanttZoomValue = () => {
  const session = React.useContext(states.session_key_context);
  return Jotai.useAtomValue(states.ganttZoomAtomMap.get(session));
};
const useGanttZoom = () => {
  const session = React.useContext(states.session_key_context);
  return Jotai.useAtom(states.ganttZoomAtomMap.get(session));
};

const ensureGanttZoom = (ganttZoom: string): types.TGanttZoom => {
  switch (ganttZoom) {
    case "D": {
      return ganttZoom;
    }
    case "W": {
      return ganttZoom;
    }
    case "M": {
      return ganttZoom;
    }
    default: {
      return "D";
    }
  }
};

const getMsecOfGanttZoom = (ganttZoom: string) => {
  return consts.MSECS[ensureGanttZoom(ganttZoom)];
};

const useComponentSize = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [res, setRes] = React.useState({ height: 0, width: 0, ref });

  React.useEffect(() => {
    const updateHeight = () => {
      if (ref.current) {
        const height = ref.current.clientHeight;
        const width = ref.current.clientWidth;
        if (height !== res.height || width !== res.width || ref !== res.ref) {
          setRes({ height, width, ref });
        }
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, [res, setRes]);
  return res;
};

const getRowBackgroundColor = (rowIndex: number) => {
  return rowIndex % 2
    ? "bg-neutral-100 dark:bg-neutral-900"
    : "bg-neutral-200 dark:bg-neutral-800";
};

const HeaderCell = React.memo(
  (props: { columnIndex: number; style: React.CSSProperties }) => {
    const ganttDt = getMsecOfGanttZoom(useGanttZoomValue());
    const t = new Date(START_TIME.f + props.columnIndex * ganttDt);
    const yy = t.getUTCFullYear() - 2000;
    const mm = (t.getUTCMonth() + 1).toString().padStart(2, "0");
    const dd = t.getUTCDate().toString().padStart(2, "0");
    const title = `${yy}${mm}${dd}`;
    return (
      <div
        style={props.style}
        className={utils.join(
          "border border-solid dark:border-neutral-500 border-neutral-400",
          isToday(props.columnIndex, ganttDt) &&
            "border-x-yellow-300 dark:border-x-yellow-700 bg-yellow-200 dark:bg-yellow-800",
        )}
      >
        {title}
      </div>
    );
  },
);

const isToday = (columnIndex: number, ganttDt: number) => {
  return (
    Math.floor((times.getFloatingNow().f - START_TIME.f) / ganttDt) ===
    columnIndex
  );
};

const IndexCell = React.memo(
  (props: {
    rowIndex: number;
    style: React.CSSProperties;
    data: types.TNodeId[];
  }) => {
    const nodeId = props.data[props.rowIndex];
    const toTree = utils.useToTree(nodeId);
    const text = types.useSelector((state) => {
      return state.swapped_caches.text[nodeId];
    });
    return (
      <div
        className="px-[0.5em] border border-solid dark:border-neutral-500 border-neutral-400 flex"
        style={props.style}
      >
        <button
          onClick={toTree}
          title={text}
          className={utils.join(
            "w-full whitespace-nowrap text-left overflow-hidden",
            getRowBackgroundColor(props.rowIndex),
          )}
        >
          {text}
        </button>
      </div>
    );
  },
);

const Cell = React.memo(
  (props: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
    data: types.TNodeId[];
  }) => {
    const nodeId = props.data[props.rowIndex];
    const events = types.useSelector(
      (state) => state.swapped_nodes.events[nodeId],
    );
    const ganttDt = getMsecOfGanttZoom(useGanttZoomValue());
    const hit = React.useMemo(() => {
      const start = { f: START_TIME.f + props.columnIndex * ganttDt };
      const end = { f: start.f + ganttDt };
      let hit = false;
      for (const event of events || []) {
        const overlapState = intervals.getOverlapState(
          start,
          end,
          times.ensureFloatingTime(event.interval_set.start),
          times.ensureFloatingTime(event.interval_set.end),
          event.interval_set.delta,
          intervals.getFloatingTimeOfLimit(event.interval_set),
        );
        if (overlapState !== intervals.Overlap.NO_OVERLAP) {
          hit = true;
          break;
        }
      }
      return hit;
    }, [events, ganttDt, props.columnIndex]);
    return (
      <div
        className={utils.join(
          "border border-solid dark:border-neutral-500 border-neutral-400",
          isToday(props.columnIndex, ganttDt) &&
            "border-x-yellow-300 dark:border-x-yellow-700",
          hit
            ? "bg-blue-400 dark:bg-blue-900"
            : getRowBackgroundColor(props.rowIndex),
        )}
        style={props.style}
      />
    );
  },
);

const GanttZoomSelector = React.memo(() => {
  const [ganttZoom, setGanttZoom] = useGanttZoom();
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setGanttZoom(ensureGanttZoom(e.target.value));
    },
    [setGanttZoom],
  );
  return (
    <select value={ganttZoom} onChange={handleChange}>
      <option value="D">Day</option>
      <option value="W">Week</option>
      <option value="M">Month</option>
    </select>
  );
});

const getScrollLeft = (now: number, ganttDt: number, columnWidth: number) => {
  return columnWidth * Math.floor((now - START_TIME.f) / ganttDt);
};

const GanttChart = React.memo((props: { indexColumnWidth: number }) => {
  const resize = useComponentSize();
  const eventss = types.useSelector((state) => state.swapped_nodes.events);
  const statuses = types.useSelector((state) => state.swapped_nodes.status);
  const childrens = types.useSelector((state) => state.swapped_nodes.children);
  const root = types.useSelector((state) => state.data.root);
  const edgeCs = types.useSelector((state) => state.swapped_edges.c);
  const todoNodeIds = React.useMemo(() => {
    const res: types.TNodeId[] = [];
    const seen = new Set();
    const rec = (nodeId: types.TNodeId) => {
      if (seen.has(nodeId)) {
        return;
      }
      if (statuses[nodeId] !== "todo") {
        return;
      }
      if (nodeId !== root) {
        seen.add(nodeId);
        res.push(nodeId);
      }
      for (const childEdgeId of ops.sorted_keys_of(childrens[nodeId])) {
        const childNodeId = edgeCs[childEdgeId];
        rec(childNodeId);
      }
    };
    rec(root);
    return res;
  }, [childrens, edgeCs, root, statuses]);
  const headerRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const indexColumnRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const ganttRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const tnow = React.useMemo(() => times.getFloatingNow(), []);
  const ganttDt = getMsecOfGanttZoom(useGanttZoomValue());
  const columnCount = (END_TIME.f - START_TIME.f) / ganttDt;
  const columnWidth = 64;
  const rowHeight = 32;
  const [filterActive, toggleFilterActive] = utils.useToggle(true);
  const initialScrollLeft = getScrollLeft(tnow.f, ganttDt, columnWidth);
  const initialScrollTop = rowHeight * 0;
  const [scrollLeft, setScrollLeft] = React.useState(initialScrollLeft);
  const onScroll = React.useCallback(
    ({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }) => {
      if (headerRef.current) {
        headerRef.current.scrollTo({ scrollLeft });
      }
      if (indexColumnRef.current) {
        indexColumnRef.current.scrollTo({ scrollTop });
      }
      setScrollLeft(scrollLeft);
    },
    [setScrollLeft],
  );
  const nodeIds = React.useMemo(() => {
    if (!filterActive) {
      return todoNodeIds;
    }
    const tStart = { f: (scrollLeft / columnWidth) * ganttDt + START_TIME.f };
    const tEnd = { f: tStart.f + (resize.width / columnWidth) * ganttDt };
    const head = [];
    const tail = [];
    for (const nodeId of todoNodeIds) {
      const events = eventss[nodeId];
      if (events === undefined) {
        tail.push(nodeId);
      } else {
        let hit = false;
        for (const event of events) {
          const overlapState = intervals.getOverlapState(
            tStart,
            tEnd,
            times.ensureFloatingTime(event.interval_set.start),
            times.ensureFloatingTime(event.interval_set.end),
            event.interval_set.delta,
            intervals.getFloatingTimeOfLimit(event.interval_set),
          );
          if (overlapState !== intervals.Overlap.NO_OVERLAP) {
            hit = true;
            break;
          }
        }
        if (hit) {
          head.push(nodeId);
        } else {
          tail.push(nodeId);
        }
      }
    }
    return head.concat(tail);
  }, [filterActive, scrollLeft, resize.width, todoNodeIds, eventss, ganttDt]);

  const indexColumnStyle = React.useMemo(() => {
    return { width: props.indexColumnWidth };
  }, [props.indexColumnWidth]);
  const headerStyle = React.useMemo(() => {
    return { height: rowHeight };
  }, [rowHeight]);

  const itemKey = React.useCallback(
    (props: { columnIndex: number; rowIndex: number }) => {
      return `${nodeIds[props.rowIndex]}/${props.columnIndex}`;
    },
    [nodeIds],
  );
  React.useEffect(() => {
    if (ganttRef.current) {
      ganttRef.current.scrollTo({
        scrollLeft: getScrollLeft(tnow.f, ganttDt, columnWidth),
      });
    }
  }, [ganttDt, tnow.f]);
  if (resize.height <= 0) {
    return (
      <div ref={resize.ref} className="h-full w-full">
        {consts.SPINNER}
      </div>
    );
  }
  return (
    <div className="content-visibility-auto h-full w-full flex-none flex flex-col">
      <div className="flex-none flex h-[3rem] items-baseline gap-[0.5em]">
        <label>Filter active:</label>
        <input
          checked={filterActive}
          onChange={toggleFilterActive}
          type="checkbox"
        />
        <label>Zoom:</label>
        <GanttZoomSelector />
      </div>
      <div className="flex-none flex" style={headerStyle}>
        <div className="flex-none" style={indexColumnStyle}>
          a\b
        </div>
        <div className="flex-auto">
          <RWindow.FixedSizeGrid
            columnCount={columnCount}
            columnWidth={columnWidth}
            height={rowHeight}
            width={resize.width}
            rowCount={1}
            rowHeight={rowHeight}
            ref={headerRef}
            style={DISABLE_SCROLLING_STYLE}
          >
            {HeaderCell}
          </RWindow.FixedSizeGrid>
        </div>
      </div>
      {/* Why `overflow-hidden` is required to make `resized.height` to be aware of the first row? */}
      <div className="flex-auto flex overflow-hidden">
        <div className="flex-none" style={indexColumnStyle}>
          <RWindow.FixedSizeGrid<types.TNodeId[]>
            columnCount={1}
            columnWidth={props.indexColumnWidth}
            height={resize.height}
            width={props.indexColumnWidth}
            rowCount={nodeIds.length}
            rowHeight={rowHeight}
            ref={indexColumnRef}
            itemKey={itemKey}
            style={DISABLE_SCROLLING_STYLE}
            itemData={nodeIds}
          >
            {IndexCell}
          </RWindow.FixedSizeGrid>
        </div>
        <div ref={resize.ref} className="flex-auto">
          <RWindow.FixedSizeGrid<types.TNodeId[]>
            columnCount={columnCount}
            columnWidth={columnWidth}
            height={resize.height}
            width={resize.width}
            rowCount={nodeIds.length}
            rowHeight={rowHeight}
            onScroll={onScroll}
            initialScrollLeft={initialScrollLeft}
            initialScrollTop={initialScrollTop}
            itemKey={itemKey}
            itemData={nodeIds}
            ref={ganttRef}
          >
            {Cell}
          </RWindow.FixedSizeGrid>
        </div>
      </div>
    </div>
  );
});

export default GanttChart;
