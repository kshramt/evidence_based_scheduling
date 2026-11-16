import * as React from "react";

import * as utils from "src/utils";
import css from "./index.module.css";

const AutoHeightTextArea = ({
  text,
  className,
  onChange,
  ...textareaProps
}: {
  text: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const [localText, setLocalText] = React.useState(text);
  React.useEffect(() => {
    setLocalText(text);
  }, [text]);

  return (
    <textarea
      {...textareaProps}
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
