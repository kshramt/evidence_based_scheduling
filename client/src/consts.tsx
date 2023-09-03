import React from "react";

export const DELETE_MARK = <span className="material-icons">close</span>;

export const NO_ESTIMATION = 0;

export const START_MARK = <span className="material-icons">play_arrow</span>;
export const START_CONCURRNET_MARK = (
  <span className="material-icons">double_arrow</span>
);
export const ADD_MARK = <span className="material-icons">add</span>;
export const DONE_MARK = <span className="material-icons">done</span>;
export const DONT_MARK = <span className="material-icons">delete</span>;
export const DETAIL_MARK = <span className="material-icons">more_vert</span>;
export const COPY_MARK = <span className="material-icons">content_copy</span>;
export const STOP_MARK = <span className="material-icons">stop</span>;
export const TOP_MARK = <span className="material-icons">arrow_upward</span>;
export const UNDO_MARK = <span className="material-icons">undo</span>;
export const MOVE_UP_MARK = <span className="material-icons">north</span>;
export const MOVE_DOWN_MARK = <span className="material-icons">south</span>;
export const EVAL_MARK = <span className="material-icons">functions</span>;
export const TOC_MARK = <span className="material-icons">toc</span>;
export const FORWARD_MARK = (
  <span className="material-icons">arrow_forward_ios</span>
);
export const BACK_MARK = <span className="material-icons">arrow_back_ios</span>;
export const SEARCH_MARK = <span className="material-icons">search</span>;
export const IDS_MARK = <span className="material-icons">content_paste</span>;
export const MOBILE_MARK = <span className="material-icons">smartphone</span>;
export const DESKTOP_MARK = (
  <span className="material-icons">desktop_windows</span>
);
export const IS_FULL_MARK = <span className="material-icons">expand_more</span>;
export const IS_NONE_MARK = <span className="material-icons">expand_less</span>;
export const IS_PARTIAL_MARK = (
  <span className="material-icons">chevron_right</span>
);

export const SPINNER = (
  <div className="animate-spin h-[3rem] w-[3rem] border-4 border-blue-500 rounded-full border-t-transparent"></div>
);

export const WEEK_0_BEGIN = new Date(Date.UTC(2021, 12 - 1, 27));
export const DAY_MSEC = 86_400 * 1_000;
export const WEEK_MSEC = 7 * DAY_MSEC;
export const MSECS = {
  D: DAY_MSEC,
  W: WEEK_MSEC,
  M: 4 * WEEK_MSEC,
};
export const EMPTY_STRING = "";

export const DEFAULT_DELAY_MSEC = 10_000;
