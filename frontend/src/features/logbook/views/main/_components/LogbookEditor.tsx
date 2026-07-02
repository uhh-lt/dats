import { MemoHooks } from "@api/hooks/MemoHooks";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { CardContainer } from "@components/CardContainer";
import { MemoEditorView } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CardHeader, CircularProgress } from "@mui/material";
import { useCallback } from "react";

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
