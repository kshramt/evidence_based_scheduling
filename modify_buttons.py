import re
import os

files_to_modify = [
    "client/src/AddButton.tsx",
    "client/src/StartButton/index.tsx",
    "client/src/TopButton/index.tsx",
    "client/src/TodoToDoneButton.tsx",
    "client/src/EvalButton.tsx",
    "client/src/TodoToDontButton.tsx",
    "client/src/ShowDetailsButton/index.tsx",
    "client/src/DoneOrDontToTodoButton.tsx",
    "client/src/StartConcurrentButton/index.tsx",
    "client/src/TogglePinButton/index.tsx",
    "client/src/StopButton/index.tsx",
    "client/src/CopyNodeIdButton/index.tsx",
    "client/src/Calendar/AddButton.tsx",
    "client/src/TocForm/Component/index.tsx",
    "client/src/EdgeRow/index.tsx",
    "client/src/EntryButtons.tsx"
]

mapping = {
    "client/src/AddButton.tsx": "Add",
    "client/src/StartButton/index.tsx": "Start",
    "client/src/TopButton/index.tsx": "Top",
    "client/src/TodoToDoneButton.tsx": "Mark as Done",
    "client/src/EvalButton.tsx": "Evaluate",
    "client/src/TodoToDontButton.tsx": "Mark as Don't",
    "client/src/ShowDetailsButton/index.tsx": "Show Details",
    "client/src/DoneOrDontToTodoButton.tsx": "Undo to Todo",
    "client/src/StartConcurrentButton/index.tsx": "Start Concurrent",
    "client/src/TogglePinButton/index.tsx": "Toggle Pin",
    "client/src/StopButton/index.tsx": "Stop",
    "client/src/CopyNodeIdButton/index.tsx": "Copy Node ID",
    "client/src/Calendar/AddButton.tsx": "Add Calendar Event",
    "client/src/TocForm/Component/index.tsx": "Toggle TOC",
    "client/src/EdgeRow/index.tsx": "Edge Row Option",
    "client/src/EntryButtons.tsx": "Move"
}

for file in files_to_modify:
    if not os.path.exists(file):
        continue
    with open(file, "r") as f:
        content = f.read()

    label = mapping[file]

    def repl(m):
        full_match = m.group(0)
        if "aria-label" in full_match or "title" in full_match:
            return full_match
        return f'{m.group(1)}className="btn-icon" title="{label}" aria-label="{label}"{m.group(3)}'

    new_content = re.sub(
        r'(<button[^>]*?)(className="btn-icon")([^>]*?>)',
        repl,
        content
    )

    with open(file, "w") as f:
        f.write(new_content)

print("Done modifying buttons")
