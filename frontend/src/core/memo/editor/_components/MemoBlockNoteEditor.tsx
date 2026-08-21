import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { memo, useCallback } from "react";

interface MemoBlockNoteEditorProps {
  editable: boolean;
  initialContentJson: string;
  // has to be a useCallback!!!
  onChange: (content: string, contentJson: string) => void;
  style?: React.CSSProperties;
}

// define the slash menu items
const itemsToDelete = new Set(["Image", "Video", "Audio", "File"]);

const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  return defaultItems.filter((item) => !itemsToDelete.has(item.title));
};

export const MemoBlockNoteEditor = memo(
  ({ initialContentJson, onChange, editable, style }: MemoBlockNoteEditorProps) => {
    const editor = useCreateBlockNote({ initialContent: initialContentJson ? JSON.parse(initialContentJson) : "" });

    const handleChange = useCallback(() => {
      if (!editor) return;
      onChange(editor.blocksToMarkdownLossy(), JSON.stringify(editor.document));
    }, [editor, onChange]);

    const handleEditorSurfaceClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (!editable || event.target !== event.currentTarget) {
          return;
        }

        const lastBlock = editor.document[editor.document.length - 1];
        if (lastBlock) {
          editor.setTextCursorPosition(lastBlock, "end");
        }
        editor.focus();
      },
      [editable, editor],
    );

    const getItemsCallback = useCallback(
      async (query: string) => filterSuggestionItems(getCustomSlashMenuItems(editor), query),
      [editor],
    );

    // Renders the editor instance using a React component.
    return (
      <BlockNoteView
        editor={editor}
        theme="light"
        className="myFlexFillAllContainer"
        slashMenu={false}
        onChange={handleChange}
        editable={editable}
        onClick={handleEditorSurfaceClick}
        style={{ cursor: editable ? "text" : undefined, ...style }}
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          // Replaces the default Slash Menu items with our custom ones.
          getItems={getItemsCallback}
        />
      </BlockNoteView>
    );
  },
);
