import EditorJS from "@editorjs/editorjs";
// @ts-ignore
import Header from "@editorjs/header";
// @ts-ignore
import Paragraph from "@editorjs/paragraph";
// @ts-ignore
import Delimiter from "@editorjs/delimiter";
// @ts-ignore
import Quote from "@editorjs/quote";
// @ts-ignore
import NestedList from "@editorjs/nested-list";
// @ts-ignore
import Checklist from "@editorjs/checklist";
// @ts-ignore
import Table from "@editorjs/table";
// @ts-ignore
import Underline from "@editorjs/underline";
// @ts-ignore
import MarkerTool from "./InlineTools/MarkerTool";
// @ts-ignore
import TimelineTool from "./BlockTools/Timeline/TimelineTool";
import { useCallback, useEffect, useRef } from "react";

const DEFAULT_INITIAL_DATA = {
  time: new Date().getTime(),
  blocks: [
    {
      type: "header",
      data: {
        text: "This is my awesome editor!",
        level: 1,
      },
    },
  ],
};

function Editor() {
  const initialized = useRef(false); // fix for react strict mode
  const ejInstance = useRef<EditorJS | null>(null);

  useEffect(() => {
    // init editor on mount
    if (!initialized.current) {
      const editor = new EditorJS({
        holder: "editorjs",
        onReady: () => {
          ejInstance.current = editor;
        },
        autofocus: true,
        data: DEFAULT_INITIAL_DATA,
        onChange: async () => {
          let content = await editor.saver.save();
          console.log(content);
        },
        // list of tools: https://github.com/editor-js/awesome-editorjs#plugins
        tools: {
          // BLOCK TOOLS
          // https://github.com/editor-js/paragraph
          paragraph: {
            class: Paragraph,
            inlineToolbar: true, // controls which Inline Tool should be available in your Block Tool. Accepts boolean value or array of Inline Tools names
          },
          // https://github.com/editor-js/header
          header: {
            class: Header,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+H",
            config: {
              placeholder: "Enter a header",
              levels: [1, 2, 3, 4],
              defaultLevel: 1,
            },
          },
          // https://github.com/editor-js/delimiter
          delimiter: {
            class: Delimiter,
            shortcut: "CMD+SHIFT+D",
          },
          // https://github.com/editor-js/nested-list
          list: {
            class: NestedList,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+L",
            config: {
              defaultStyle: "unordered", // ordered or unordered
            },
          },
          // https://github.com/editor-js/quote
          quote: {
            class: Quote,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+Q",
            config: {
              quotePlaceholder: "Enter a quote",
              captionPlaceholder: "Quote's author",
            },
          },
          // https://github.com/editor-js/checklist
          checklist: {
            class: Checklist,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+C",
            // overwrite toolbox display
            toolbox: {
              title: "Checklist LOL",
              // icon: '<svg width="10" height="10"><rect width="10" height="10" style="fill:rgba(0, 0, 0, 0);stroke-width:1;stroke:rgb(0, 0, 0)"/></svg>',
            },
          },
          // https://github.com/editor-js/table
          table: {
            class: Table,
            inlineToolbar: true,
            shortcut: "CMD+SHIFT+T",
            config: {
              rows: 3,
              cols: 3,
            },
          },
          timeline: {
            // @ts-ignore
            class: TimelineTool,
          },

          // INLINE TOOLS
          // https://github.com/editor-js/underline
          underline: Underline,
          marker: {
            class: MarkerTool,
          },
        },
      });
      initialized.current = true;
    }

    // destroy editor on unmount
    return () => {
      ejInstance?.current?.destroy();
      ejInstance.current = null;
    };
  }, []);

  return (
    <>
      <div id="editorjs"></div>
    </>
  );
}

export default Editor;
