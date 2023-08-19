import * as React from "react";
import * as RWindow from "react-window";

import * as consts from "src/consts";
import * as intervals from "src/intervals";
import * as utils from "src/utils";
import * as times from "src/times";
import * as types from "src/types";

const DAY_MS = 86_400_000;
const START_TIME = { f: Number(new Date("2000-01-01T00:00:00Z")) };
const END_TIME = { f: Number(new Date("2100-01-01T00:00:00Z")) };

const DISABLE_SCROLLING_STYLE = { overflow: "hidden" };

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

const HeaderCell = React.memo(
  (props: { columnIndex: number; style: React.CSSProperties }) => {
    const t = new Date(START_TIME.f + props.columnIndex * DAY_MS);
    const title = `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
    return (
      <div
        style={props.style}
        className="border dark:border-neutral-500 border-neutral-400"
      >
        {title}
      </div>
    );
  },
);

const IndexCell = React.memo(
  (props: {
    rowIndex: number;
    style: React.CSSProperties;
    data: types.TNodeId[];
  }) => {
    const nodeId = props.data[props.rowIndex];
    const toTree = utils.useToTree(nodeId);
    const text = types.useSelector((state) => {
      return state.caches[nodeId].text;
    });
    return (
      <div
        className="px-[0.5em] border dark:border-neutral-500 border-neutral-400 flex"
        style={props.style}
      >
        <button
          onClick={toTree}
          title={text}
          className="w-full whitespace-nowrap text-left overflow-hidden"
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
      (state) => state.data.nodes[nodeId].events,
    );
    const hit = React.useMemo(() => {
      const start = { f: START_TIME.f + props.columnIndex * DAY_MS };
      const end = { f: start.f + DAY_MS };
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
    }, [events, props.columnIndex]);
    return (
      <div
        className={utils.join(
          "border dark:border-neutral-500 border-neutral-400",
          hit && "bg-blue-400 dark:bg-blue-900",
        )}
        style={props.style}
      />
    );
  },
);

const GanttChart = React.memo((props: { indexColumnWidth: number }) => {
  const resize = useComponentSize();
  const todoNodeIds = types.useSelector((state) => state.todo_node_ids);
  const nodes = types.useSelector((state) => state.data.nodes);
  const headerRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const indexColumnRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const tnow = times.getFloatingNow();
  const columnCount = (END_TIME.f - START_TIME.f) / DAY_MS;
  const columnWidth = 96;
  const rowHeight = 32;
  const [filterActive, toggleFilterActive] = utils.useToggle(true);
  const initialScrollLeft =
    columnWidth * Math.floor((tnow.f - START_TIME.f) / DAY_MS);
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
    const dt = DAY_MS;
    const tStart = { f: (scrollLeft / columnWidth) * dt + START_TIME.f };
    const tEnd = { f: tStart.f + (resize.width / columnWidth) * dt };
    const head = [];
    const tail = [];
    for (const nodeId of todoNodeIds) {
      const events = nodes[nodeId].events;
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
    console.debug(head);
    return head.concat(tail);
  }, [filterActive, scrollLeft, resize.width, todoNodeIds, nodes]);

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

  if (resize.height <= 0) {
    return (
      <div ref={resize.ref} className="h-full w-full">
        {consts.SPINNER}
      </div>
    );
  }
  return (
    <div className="h-full w-full flex-none flex flex-col">
      <div className="flex-none flex h-[3rem] items-center gap-[0.5em]">
        <label>Filter active:</label>
        <input
          checked={filterActive}
          onChange={toggleFilterActive}
          type="checkbox"
        />
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
          >
            {Cell}
          </RWindow.FixedSizeGrid>
        </div>
      </div>
    </div>
  );
});

export default GanttChart;
