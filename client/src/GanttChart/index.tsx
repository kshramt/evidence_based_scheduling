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

const useComponentSize = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [res, setRes] = React.useState({ height: -1, width: -1, ref });

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
    return <div style={props.style}>{title}</div>;
  },
);

const IndexCell = React.memo(
  (props: { rowIndex: number; style: React.CSSProperties }) => {
    const text = types.useSelector((state) => {
      return state.caches[state.todo_node_ids[props.rowIndex]].text;
    });
    return (
      <div
        title={text}
        className="px-[0.5em] overflow-hidden"
        style={props.style}
      >
        {text}
      </div>
    );
  },
);

const GanttChart = React.memo((props: { indexColumnWidth: number }) => {
  const resize = useComponentSize();
  const nodeIds = types.useSelector((state) => state.todo_node_ids);
  const style = React.useMemo(() => {
    return { overflow: "hidden" };
  }, []);
  const nodes = types.useSelector((state) => state.data.nodes);
  const headerRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const indexColumnRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const onScroll = React.useCallback(
    ({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }) => {
      if (headerRef.current) {
        headerRef.current.scrollTo({ scrollLeft });
      }
      if (indexColumnRef.current) {
        indexColumnRef.current.scrollTo({ scrollTop });
      }
    },
    [],
  );
  const tnow = times.getFloatingNow();
  const columnCount = (END_TIME.f - START_TIME.f) / DAY_MS;
  const columnWidth = 96;
  const rowHeight = 32;
  const initialScrollLeft =
    columnWidth * Math.floor((tnow.f - START_TIME.f) / DAY_MS);
  const initialScrollTop = rowHeight * 0;

  const _Cell = React.useCallback(
    (props: {
      columnIndex: number;
      rowIndex: number;
      style: React.CSSProperties;
    }) => {
      const start = { f: START_TIME.f + props.columnIndex * DAY_MS };
      const end = { f: start.f + DAY_MS };
      let hit = false;
      for (const event of nodes[nodeIds[props.rowIndex]].events || []) {
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
      return (
        <div
          className={utils.join(
            "border",
            hit && "bg-blue-400 dark:bg-blue-900",
          )}
          style={props.style}
        />
      );
    },
    [nodes, nodeIds],
  );
  const Cell = React.useMemo(() => React.memo(_Cell), [_Cell]);
  const styleIndexColumn = React.useMemo(() => {
    return { width: props.indexColumnWidth };
  }, [props.indexColumnWidth]);

  if (resize.height < 0) {
    return (
      <div ref={resize.ref} className="h-full w-full">
        {consts.SPINNER}
      </div>
    );
  }
  return (
    <div className="h-full w-full flex-none flex flex-col">
      <div className="flex-none flex" style={{ height: rowHeight }}>
        <div className="flex-none" style={styleIndexColumn}>
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
            style={style}
          >
            {HeaderCell}
          </RWindow.FixedSizeGrid>
        </div>
      </div>
      {/* Why `overflow-hidden` is required to make `resized.height` to be aware of the first row? */}
      <div className="flex-auto flex overflow-hidden">
        <div className="flex-none" style={styleIndexColumn}>
          <RWindow.FixedSizeGrid
            columnCount={1}
            columnWidth={props.indexColumnWidth}
            height={resize.height}
            width={props.indexColumnWidth}
            rowCount={nodeIds.length}
            rowHeight={rowHeight}
            ref={indexColumnRef}
            style={style}
          >
            {IndexCell}
          </RWindow.FixedSizeGrid>
        </div>
        <div ref={resize.ref} className="flex-auto">
          <RWindow.FixedSizeGrid
            columnCount={columnCount}
            columnWidth={columnWidth}
            height={resize.height}
            width={resize.width}
            rowCount={nodeIds.length}
            rowHeight={rowHeight}
            onScroll={onScroll}
            initialScrollLeft={initialScrollLeft}
            initialScrollTop={initialScrollTop}
          >
            {Cell}
          </RWindow.FixedSizeGrid>
        </div>
      </div>
    </div>
  );
});

export default GanttChart;
