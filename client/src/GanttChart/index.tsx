import * as React from "react";
import * as RWindow from "react-window";

import * as consts from "src/consts";
import * as utils from "src/utils";
import * as types from "src/types";

const DAY_MS = 86_400_000;
const START_TIME = Number(new Date("2000-01-01T00:00:00Z"));
const END_TIME = Number(new Date("2100-01-01T00:00:00Z"));

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
  }, [ref.current, res, setRes]);
  return res;
};

const Cell = React.memo(
  (props: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    return (
      <div style={props.style}>
        {props.columnIndex}, {props.rowIndex}
      </div>
    );
  },
);

const HeaderCell = React.memo(
  (props: { columnIndex: number; style: React.CSSProperties }) => {
    const t = new Date(START_TIME + props.columnIndex * DAY_MS);
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
    [headerRef.current, indexColumnRef.current],
  );
  const tnow = utils.floatingNow();
  const columnCount = (END_TIME - START_TIME) / DAY_MS;
  const columnWidth = 128;
  const rowHeight = 32;
  const initialScrollLeft =
    columnWidth * Math.floor((tnow - START_TIME) / DAY_MS);
  const initialScrollTop = rowHeight * 0;

  if (resize.height < 0) {
    return (
      <div ref={resize.ref} className="h-full w-full">
        {consts.SPINNER}
      </div>
    );
  }
  return (
    <div className="h-full w-full bg-red-500 flex-none flex flex-col">
      <div className="flex-none flex bg-blue-300" style={{ height: rowHeight }}>
        <div
          className="flex-none bg-yellow-300"
          style={{ width: props.indexColumnWidth }}
        >
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
      <div className="flex-auto flex bg-green-400 overflow-hidden">
        <div
          className="flex-none bg-purple-600"
          style={{ width: props.indexColumnWidth }}
        >
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
