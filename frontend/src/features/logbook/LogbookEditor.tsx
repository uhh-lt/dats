import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { CardHeader, CircularProgress } from "@mui/material";
import { useCallback } from "react";
import { MemoHooks } from "../../api/MemoHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { CardContainer } from "../../components/MUI/CardContainer.tsx";
import { MemoEditorView } from "../../core/memo/editor/MemoEditorView.tsx";

interface LogbookEditorProps {
  projectId: number;
}

export function LogbookEditor({ projectId }: LogbookEditorProps) {
  // global client state
  const projectMemo = MemoHooks.useGetUserMemo(AttachedObjectType.PROJECT, projectId);

  // update memo
  const { mutate: updateMemo } = MemoHooks.useUpdateMemo();
  const handleMemoChange = useCallback(
    (markdown: string, json: string) => {
      if (!projectMemo.data) return;
      updateMemo({
        memoId: projectMemo.data.id,
        requestBody: {
          content: markdown,
          content_json: json,
        },
      });
    },
    [projectMemo.data, updateMemo],
  );

  return (
    <CardContainer className="h100 myFlexContainer">
      <CardHeader title="Project Logbook" />
      {projectMemo.isLoading || projectMemo.isRefetching ? (
        <CircularProgress />
      ) : projectMemo.isError ? (
        <div>Error: {projectMemo.error.message}</div>
      ) : projectMemo.isSuccess ? (
        <MemoEditorView
          initialContentJson={projectMemo.data.content_json}
          onChange={handleMemoChange}
          editable={true}
        />
      ) : null}
    </CardContainer>
  );
}
