import * as React from "react";

import * as utils from "src/utils";
import css from "./index.module.css";

export const DraftStatusContext = React.createContext<
  ((editor: string, dirty: boolean) => void) | null
>(null);

const AutoHeightTextArea = ({
  ref,
  text,
  className,
  onChange,
  trackDraft,
  ...textareaProps
}: {
  ref?: React.Ref<HTMLTextAreaElement>;
  text: string;
  trackDraft?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const [localText, setLocalText] = React.useState(text);
  React.useEffect(() => {
    setLocalText(text);
  }, [text]);

  const reportDraft = React.use(DraftStatusContext);
  const editor = React.useId();
  const dirty = trackDraft && localText !== text;
  React.useEffect(() => {
    if (!dirty || reportDraft === null) return;
    reportDraft(editor, true);
    return () => reportDraft(editor, false);
  }, [dirty, editor, reportDraft]);

  return (
    <textarea
      {...textareaProps}
      ref={ref}
      className={utils.join(css.auto_height_textarea, className)}
      value={localText}
      onChange={(event) => {
        setLocalText(event.currentTarget.value);
        onChange?.(event);
      }}
    />
  );
};

export default AutoHeightTextArea;
