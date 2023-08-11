import * as React from "react";
import * as RWindow from "react-window";

import * as consts from "src/consts";

const useComponentSize = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [res, setRes] = React.useState({ height: -1, width: -1, ref });

  React.useEffect(() => {
    const updateHeight = () => {
      if (ref.current) {
        const height = ref.current.offsetHeight;
        const width = ref.current.offsetWidth;
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

const GanttChart = React.memo((props: { className?: string }) => {
  const resize = useComponentSize();

  if (resize.height < 0) {
    return (
      <div ref={resize.ref} className={props.className}>
        {consts.SPINNER}
      </div>
    );
  }
  return (
    <div className="h-full w-full p-[5%]">
      <div ref={resize.ref} className={props.className}>
        <RWindow.FixedSizeGrid
          columnCount={200}
          columnWidth={128}
          height={resize.height}
          width={resize.width}
          rowCount={9000}
          rowHeight={32}
        >
          {Cell}
        </RWindow.FixedSizeGrid>
      </div>
    </div>
  );
});

export default GanttChart;
