import * as React from "react";
import * as RWindow from "react-window";

import * as consts from "src/consts";
import * as types from "src/types";

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
    return <div style={props.style}>{props.columnIndex}</div>;
  },
);

const IndexCell = React.memo(
  (props: { rowIndex: number; style: React.CSSProperties }) => {
    return <div style={props.style}>{props.rowIndex}</div>;
  },
);

const GanttChart = React.memo(() => {
  const resize = useComponentSize();
  const nodeIds = types.useSelector((state) => state.todo_node_ids);
  const style = React.useMemo(() => {
    return { overflow: "hidden" };
  }, []);
  const headerRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const indexRef = React.useRef<RWindow.FixedSizeGrid>(null);
  const onScroll = React.useCallback(
    ({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }) => {
      if (headerRef.current) {
        headerRef.current.scrollTo({ scrollLeft });
      }
      if (indexRef.current) {
        indexRef.current.scrollTo({ scrollTop });
      }
    },
    [headerRef.current, indexRef.current],
  );
  const t1 = Number(new Date("2000-01-01T00:00:00Z"));
  const t2 = Number(new Date("2100-01-01T00:00:00Z"));
  const columnCount = 200;
  const columnWidth = 128;
  const rowHeight = 32;

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
        <div className="flex-none bg-yellow-300" style={{ width: columnWidth }}>
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
      {/* Why `overflow-hidden` is required to make `resized.height` to be aware of the first row. */}
      <div className="flex-auto flex bg-green-400 overflow-hidden">
        <div
          className="flex-none bg-purple-600"
          style={{ width: columnWidth }}
        >
          <RWindow.FixedSizeGrid
            columnCount={1}
            columnWidth={columnWidth}
            height={resize.height}
            width={columnWidth}
            rowCount={nodeIds.length}
            rowHeight={rowHeight}
            ref={indexRef}
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
          >
            {Cell}
          </RWindow.FixedSizeGrid>
        </div>
      </div>
    </div>
  );
});

export default GanttChart;
