import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { useEffect, useState } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { useDebounce } from "../../utils/useDebounce.ts";

interface MemoBlockEditorViewProps {
  memo: MemoRead;
  editable: boolean;
}

// define the slash menu items
const itemsToDelete = new Set(["Image", "Video", "Audio", "File"]);
const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  return defaultItems.filter((item) => !itemsToDelete.has(item.title));
};

function MemoBlockEditorView({ memo, editable }: MemoBlockEditorViewProps) {
  // local state
  const [content, setContent] = useState<string>(memo.content_json);
  const editor = useCreateBlockNote({ initialContent: memo.content_json ? JSON.parse(memo.content_json) : "" });

  // persist changes automatically feature
  const debouncedContent = useDebounce(content, 1000);
  const { mutate: updateMemo } = MemoHooks.useUpdateMemo();
  const handleChange = () => {
    if (!editor) return;
    setContent(JSON.stringify(editor.document));
  };
  useEffect(() => {
    if (!editor || !debouncedContent) return;
    // only update if there are actually changes
    if (debouncedContent === memo.content_json) return;

    editor.blocksToMarkdownLossy().then((markdown) => {
      updateMemo({
        memoId: memo.id,
        requestBody: {
          content: markdown,
          content_json: debouncedContent,
        },
      });
    });
  }, [debouncedContent, editor, memo, updateMemo]);

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="myFlexFillAllContainer"
      slashMenu={false}
      onChange={handleChange}
      editable={editable}
    >
      <SuggestionMenuController
        triggerCharacter={"/"}
        // Replaces the default Slash Menu items with our custom ones.
        getItems={async (query) => filterSuggestionItems(getCustomSlashMenuItems(editor), query)}
      />
    </BlockNoteView>
  );
}

export default MemoBlockEditorView;
