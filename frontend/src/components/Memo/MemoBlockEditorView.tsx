import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { memo, useCallback, useEffect, useState } from "react";
import { useDebounce } from "../../utils/useDebounce.ts";

interface MemoBlockEditorViewProps {
  editable: boolean;
  initialContentJson: string;
  // has to be a useCallback!!!
  onChange: (content: string, contentJson: string) => void;
  debounce?: number;
  style?: React.CSSProperties;
}

// define the slash menu items
const itemsToDelete = new Set(["Image", "Video", "Audio", "File"]);

const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  return defaultItems.filter((item) => !itemsToDelete.has(item.title));
};

function MemoBlockEditorView({ initialContentJson, onChange, editable, debounce, style }: MemoBlockEditorViewProps) {
  // local state
  const [content, setContent] = useState<string>(initialContentJson);
  const editor = useCreateBlockNote({ initialContent: initialContentJson ? JSON.parse(initialContentJson) : "" });

  // persist changes automatically feature
  const debouncedContent = useDebounce(content, debounce ?? 1000);

  const handleChange = useCallback(() => {
    if (!editor) return;
    setContent(JSON.stringify(editor.document));
  }, [editor]);

  const getItemsCallback = useCallback(
    async (query: string) => filterSuggestionItems(getCustomSlashMenuItems(editor), query),
    [editor],
  );

  useEffect(() => {
    if (!editor || !debouncedContent) return;
    // only update if there are actually changes
    if (debouncedContent === initialContentJson) return;
    editor.blocksToMarkdownLossy().then((markdown) => {
      onChange(markdown, debouncedContent);
    });
  }, [initialContentJson, debouncedContent, editor, onChange]);

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="myFlexFillAllContainer"
      slashMenu={false}
      onChange={handleChange}
      editable={editable}
      style={style}
    >
      <SuggestionMenuController
        triggerCharacter={"/"}
        // Replaces the default Slash Menu items with our custom ones.
        getItems={getItemsCallback}
      />
    </BlockNoteView>
  );
}

export default memo(MemoBlockEditorView);
