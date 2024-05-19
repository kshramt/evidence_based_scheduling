import * as React from "react";

import * as utils from "src/utils";
import css from "./index.module.css";

const handleTrailingNewline = (x: string) => x + "\u200b";

const AutoHeightTextArea = React.forwardRef<
  HTMLTextAreaElement,
  {
    text: string;
    className?: undefined | string;
  } & Omit<
    React.HTMLProps<HTMLTextAreaElement>,
    "ref" | "placeholder" | "value" | "defaultValue" | "className"
  >
>(({ text, className, ...textareaProps }, ref) => {
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
        // eslint-disable-next-line react-compiler/react-compiler
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
});

export default AutoHeightTextArea;
