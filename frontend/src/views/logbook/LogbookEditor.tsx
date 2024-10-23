import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
// eslint-disable-next-line import/no-unresolved
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
// eslint-disable-next-line import/no-unresolved
import "@blocknote/mantine/style.css";
import { DefaultReactSuggestionItem, getDefaultReactSlashMenuItems, SuggestionMenuController } from "@blocknote/react";
import { Card, CardHeader, CircularProgress } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import MemoHooks from "../../api/MemoHooks.ts";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { useDebounce } from "../../utils/useDebounce.ts";

interface LogbookEditorProps {
  projectId: number;
}

// define the slash menu items
const itemsToDelete = new Set(["Image", "Video", "Audio", "File"]);
const getCustomSlashMenuItems = (editor: BlockNoteEditor): DefaultReactSuggestionItem[] => {
  const defaultItems = getDefaultReactSlashMenuItems(editor);
  return defaultItems.filter((item) => !itemsToDelete.has(item.title));
};

function LogbookEditor({ projectId }: LogbookEditorProps) {
  // global client state
  const projectMemo = ProjectHooks.useGetOrCreateMemo(projectId);

  // persist changes feature
  const [content, setContent] = useState<string | undefined>(undefined);
  const debouncedContent = useDebounce(content, 1000);
  const { mutate: updateProjectMemo } = MemoHooks.useUpdateMemo();
  const handleChange = () => {
    if (!editor) return;
    // we need to store the content also as a string to make it searchable
    // console.log(editor.blocksToMarkdownLossy());
    setContent(JSON.stringify(editor.document));
  };
  useEffect(() => {
    if (!projectMemo.data || !debouncedContent) return;
    updateProjectMemo({
      memoId: projectMemo.data.id,
      requestBody: {
        content: debouncedContent,
      },
    });
  }, [debouncedContent, projectMemo.data, updateProjectMemo]);

  // Creates a new editor instance.
  // We use useMemo + createBlockNoteEditor instead of useCreateBlockNote so we
  // can delay the creation of the editor until the initial content is loaded.
  const editor = useMemo(() => {
    if (!projectMemo.data) {
      return undefined;
    }
    const initialContent = projectMemo.data.content ? JSON.parse(projectMemo.data.content) : "";
    setContent(projectMemo.data.content);
    return BlockNoteEditor.create({ initialContent });
  }, [projectMemo.data]);

  // Renders the editor instance using a React component.
  return (
    <Card className="h100 myFlexContainer">
      <CardHeader title="Project Logbook" />
      {editor ? (
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
      ) : (
        <CircularProgress />
      )}
    </Card>
  );
}

export default LogbookEditor;
