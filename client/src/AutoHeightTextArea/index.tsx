import * as React from "react";

import * as utils from "src/utils";
import css from "./index.module.css";

const handleTrailingNewline = (x: string) => x + "\u200b";

const AutoHeightTextArea = ({
  ref,
  text,
  className,
  ...textareaProps
}: {
  ref?: React.RefObject<null | HTMLTextAreaElement>;
  text: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const [localLext, setLocalText] = React.useState(text);
  React.useEffect(() => {
    setLocalText(text);
  }, [text]);
  const divRef = React.useRef<HTMLDivElement>(null);
  const handleChange = React.useMemo(() => {
    const onChange = textareaProps.onChange;
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      const spacer = divRef.current;
      if (spacer) {
        spacer.textContent = handleTrailingNewline(el.value);
      }
      setLocalText(el.value);
      if (onChange) {
        onChange(e);
      }
    };
  }, [textareaProps.onChange]);

  return (
    <div className={css.auto_height_container}>
      <div
        className={utils.join(css.auto_height_spacer, className)}
        aria-hidden="true"
        ref={divRef}
      >
        {handleTrailingNewline(text)}
      </div>
      <textarea
        className={utils.join(css.auto_height_textarea, className)}
        onChange={handleChange}
        value={localLext}
        {...textareaProps}
        ref={ref}
      />
    </div>
  );
};

export default AutoHeightTextArea;
