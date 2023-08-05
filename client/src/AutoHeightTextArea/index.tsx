import * as React from "react";

import * as utils from "src/utils";

const handleTrailingNewline = (x: string) => x + "\u200b";

const AutoHeightTextArea = React.forwardRef<
  HTMLTextAreaElement,
  {
    text: string;
  } & Omit<React.HTMLProps<HTMLTextAreaElement>, "ref">
>(({ text, className, ...textarea_props }, ref) => {
  const [local_text, set_local_text] = React.useState(text);
  React.useEffect(() => {
    set_local_text(text);
  }, [text]);
  const divRef = React.useRef<HTMLDivElement>(null);
  const on_change = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      const spacer = divRef.current;
      if (spacer) {
        spacer.textContent = handleTrailingNewline(el.value);
      }
      set_local_text(el.value);
    },
    [divRef],
  );

  return (
    <div className="auto_height_container">
      <div
        className={utils.join(className, "auto_height_spacer")}
        aria-hidden="true"
        ref={divRef}
      >
        {handleTrailingNewline(text)}
      </div>
      <textarea
        className={utils.join(className, "auto_height_textarea")}
        onChange={on_change}
        value={local_text}
        {...textarea_props}
        ref={ref}
      />
    </div>
  );
});

export default AutoHeightTextArea;
