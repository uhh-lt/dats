import { Editor } from "@toast-ui/react-editor";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import MemoHooks from "../../api/MemoHooks";
import ProjectHooks from "../../api/ProjectHooks";
import { useAuth } from "../../auth/AuthProvider";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";
import ExporterAPI from "../../features/Exporter/ExporterAPI";

const toolbarItems = [
  ["heading", "bold", "italic", "strike"],
  ["hr", "quote"],
  ["ul", "ol", "task", "indent", "outdent"],
  ["table", "image", "link"],
  ["code", "codeblock"],
  // Using Option: Customize the last button
  [
    {
      name: "export",
      tooltip: "Export logbook",
      command: "export",
      className: "toastui-editor-toolbar-icons last",
      style: { backgroundImage: "none" },
      text: "↓",
    },
  ],
];

function LogbookEditor() {
  // local state
  const editorRef = React.createRef<Editor>();

  // global client state
  const { user } = useAuth();
  const { projectId } = useParams() as { projectId: string };

  // global server state (react query)
  const projectMemo = ProjectHooks.useGetMemo(parseInt(projectId), user.data?.id);

  // mutations
  const createMutation = ProjectHooks.useCreateMemo();
  const updateMutation = MemoHooks.useUpdateMemo();

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

        updateMutation.mutate(
          {
            memoId: projectMemo.data.id,
            requestBody: {
              content: content,
            },
          },
          {
            onSuccess: (data) => {
              SnackbarAPI.openSnackbar({
                text: `Updated Logbook for project ${data.project_id}`,
                severity: "success",
              });
            },
          }
        );
      } else {
        createMutation.mutate(
          {
            projId: parseInt(projectId),
            requestBody: {
              content: content,
              starred: false,
              title: "Logbook of user " + user.data!.id,
              user_id: user.data!.id,
              project_id: parseInt(projectId),
            },
          },
          {
            onSuccess: (data) => {
              SnackbarAPI.openSnackbar({
                text: `Created Logbook for project ${data.project_id}`,
                severity: "success",
              });
            },
          }
        );
      }
    }
  };

  // add custom commands to editor (export feature)
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current.getInstance();
    editor.addCommand("markdown", "export", () => {
      ExporterAPI.openExporterDialog({ type: "Logbook", singleUser: true, sdocId: -1, users: [] });
      return true;
    });
    editor.addCommand("wysiwyg", "export", () => {
      ExporterAPI.openExporterDialog({ type: "Logbook", singleUser: true, sdocId: -1, users: [] });
      return true;
    });
  }, [editorRef]);

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
          toolbarItems={toolbarItems}
        />
      ) : null}
    </>
  );
}

export default LogbookEditor;
