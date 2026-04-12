export const TREE_PREFIX = "t-";

export const MINUTE = 60 * 1_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const DELETE_MARK = <span className="material-icons" aria-hidden="true">close</span>;

export const NO_ESTIMATION = 0;

export const START_MARK = <span className="material-icons" aria-hidden="true">play_arrow</span>;
export const START_CONCURRNET_MARK = (
  <span className="material-icons" aria-hidden="true">double_arrow</span>
);
export const ADD_MARK = <span className="material-icons" aria-hidden="true">add</span>;
export const DONE_MARK = <span className="material-icons" aria-hidden="true">done</span>;
export const DONT_MARK = <span className="material-icons" aria-hidden="true">delete</span>;
export const DETAIL_MARK = <span className="material-icons" aria-hidden="true">more_vert</span>;
export const COPY_MARK = <span className="material-icons" aria-hidden="true">content_copy</span>;
export const STOP_MARK = <span className="material-icons" aria-hidden="true">stop</span>;
export const TOP_MARK = <span className="material-icons" aria-hidden="true">arrow_upward</span>;
export const UNDO_MARK = <span className="material-icons" aria-hidden="true">undo</span>;
export const MOVE_UP_MARK = <span className="material-icons" aria-hidden="true">north</span>;
export const MOVE_DOWN_MARK = <span className="material-icons" aria-hidden="true">south</span>;
export const EVAL_MARK = <span className="material-icons" aria-hidden="true">functions</span>;
export const TOC_MARK = <span className="material-icons" aria-hidden="true">toc</span>;
export const FORWARD_MARK = (
  <span className="material-icons" aria-hidden="true">arrow_forward_ios</span>
);
export const BACK_MARK = <span className="material-icons" aria-hidden="true">arrow_back_ios</span>;
export const SEARCH_MARK = <span className="material-icons" aria-hidden="true">search</span>;
export const IDS_MARK = <span className="material-icons" aria-hidden="true">content_paste</span>;
export const MOBILE_MARK = <span className="material-icons" aria-hidden="true">smartphone</span>;
export const DESKTOP_MARK = (
  <span className="material-icons" aria-hidden="true">desktop_windows</span>
);
export const IS_FULL_MARK = <span className="material-icons" aria-hidden="true">expand_more</span>;
export const IS_NONE_MARK = <span className="material-icons" aria-hidden="true">expand_less</span>;
export const IS_PARTIAL_MARK = (
  <span className="material-icons" aria-hidden="true">chevron_right</span>
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
  Q: 13 * WEEK_MSEC,
  Y: 52 * WEEK_MSEC,
};
export const EMPTY_STRING = "";

export const DEFAULT_DELAY_MSEC = 10_000;
