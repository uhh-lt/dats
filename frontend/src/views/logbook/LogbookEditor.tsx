// eslint-disable-next-line import/no-unresolved
import "@blocknote/core/fonts/inter.css";
// eslint-disable-next-line import/no-unresolved
import "@blocknote/mantine/style.css";
import { Card, CardHeader, CircularProgress } from "@mui/material";
import ProjectHooks from "../../api/ProjectHooks.ts";
import MemoBlockEditorView from "../../components/Memo/MemoBlockEditorView.tsx";

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
        <MemoBlockEditorView memo={projectMemo.data} />
      ) : null}
    </Card>
  );
}

export default LogbookEditor;
