import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
// eslint-disable-next-line import/no-unresolved
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
// eslint-disable-next-line import/no-unresolved
import "@blocknote/mantine/style.css";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { Card, CardHeader, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { useDebounce } from "../../utils/useDebounce.ts";

interface LogbookEditorProps {
  projectId: number;
}

function LogbookEditor({ projectId }: LogbookEditorProps) {
  // global client state
  const projectMemo = ProjectHooks.useGetOrCreateMemo(projectId);

  return (
    <Card className="h100 myFlexContainer">
      <CardHeader title="Project Logbook" />
      {projectMemo.isLoading || projectMemo.isRefetching ? (
        <CircularProgress />
      ) : projectMemo.isError ? (
        <div>Error: {projectMemo.error.message}</div>
      ) : projectMemo.isSuccess ? (
        <LogbookEditorView memo={projectMemo.data} />
      ) : null}
    </Card>
  );
}

interface LogbookEditorViewProps {
  memo: MemoRead;
}

// define the slash menu items
const itemsToDelete = new Set(["Image", "Video", "Audio", "File"]);
const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  return defaultItems.filter((item) => !itemsToDelete.has(item.title));
};

function LogbookEditorView({ memo }: LogbookEditorViewProps) {
  // local state
  const [content, setContent] = useState<string>(memo.content_json);
  const editor = useCreateBlockNote({ initialContent: memo.content_json ? JSON.parse(memo.content_json) : "" });

  // persist changes automatically feature
  const debouncedContent = useDebounce(content, 1000);
  const { mutate: updateProjectMemo } = MemoHooks.useUpdateMemo();
  const handleChange = () => {
    if (!editor) return;
    setContent(JSON.stringify(editor.document));
  };
  useEffect(() => {
    if (!editor || !debouncedContent) return;
    // only update if there are actually changes
    if (debouncedContent === memo.content_json) return;

    editor.blocksToMarkdownLossy().then((markdown) => {
      updateProjectMemo({
        memoId: memo.id,
        requestBody: {
          content: markdown,
          content_json: debouncedContent,
        },
      });
    });
  }, [debouncedContent, editor, memo, updateProjectMemo]);

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      className="myFlexFillAllContainer"
      slashMenu={false}
      onChange={handleChange}
    >
      <SuggestionMenuController
        triggerCharacter={"/"}
        // Replaces the default Slash Menu items with our custom ones.
        getItems={async (query) => filterSuggestionItems(getCustomSlashMenuItems(editor), query)}
      />
    </BlockNoteView>
  );
}

export default LogbookEditor;
