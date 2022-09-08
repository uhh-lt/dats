import React from "react";
import { Editor } from "@toast-ui/react-editor";
import ProjectHooks from "../../api/ProjectHooks";
import { useAuth } from "../../auth/AuthProvider";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../api/QueryKey";
import MemoHooks from "../../api/MemoHooks";

function LogbookEditor() {
  // local state
  const editorRef = React.createRef<Editor>();

  // global client state
  const { user } = useAuth();
  const { projectId } = useParams() as { projectId: string };

  // global server state (react query)
  const projectMemo = ProjectHooks.useGetMemo(parseInt(projectId), user.data?.id);

  // mutations
  const queryClient = useQueryClient();
  const createMutation = ProjectHooks.useCreateMemo({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_MEMO, data.project_id, data.user_id]);
      SnackbarAPI.openSnackbar({
        text: `Created Logbook for project ${data.project_id}`,
        severity: "success",
      });
    },
  });
  const updateMutation = MemoHooks.useUpdateMemo({
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_MEMO, data.project_id, data.user_id]);
      SnackbarAPI.openSnackbar({
        text: `Updated Logbook for project ${data.project_id}`,
        severity: "success",
      });
    },
  });

  // handle ui events
  const handleSave = () => {
    if (!user.data) return;

    const editor = editorRef.current?.getInstance();
    if (editor) {
      const content = editor.getMarkdown();

      // create new memo
      if (projectMemo.data) {
        // only update if new content
        if (content === projectMemo.data.content) {
          return;
        }

        updateMutation.mutate({
          memoId: projectMemo.data.id,
          requestBody: {
            content: content,
          },
        });
      } else {
        createMutation.mutate({
          projId: parseInt(projectId),
          requestBody: {
            content: content,
            starred: false,
            title: "Logbook of user " + user.data!.id,
            user_id: user.data!.id,
            project_id: parseInt(projectId),
          },
        });
      }
    }
  };

  return (
    <>
      {!projectMemo.isLoading && user.data ? (
        <Editor
          initialValue={projectMemo.data?.content || "This is your logbook. Have fun!"}
          previewStyle="vertical"
          height="100%"
          initialEditType="wysiwyg"
          useCommandShortcut={true}
          usageStatistics={false}
          hideModeSwitch={true}
          ref={editorRef}
          onBlur={() => handleSave()}
        />
      ) : null}
    </>
  );
}

export default LogbookEditor;
