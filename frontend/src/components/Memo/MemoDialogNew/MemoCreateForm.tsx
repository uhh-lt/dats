import SaveIcon from "@mui/icons-material/Save";
import { DialogContent, Divider, IconButton, Toolbar, Typography } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { SubmitHandler } from "react-hook-form";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import EditableTypography from "../../EditableTypography.tsx";
import MemoBlockEditorView from "../MemoBlockEditorView.tsx";

export interface MemoFormValues {
  title: string;
  content: string;
  content_json: string;
}

interface MemoCreateFormProps {
  attachedObjectType: AttachedObjectType;
  handleCreateMemo: SubmitHandler<MemoFormValues>;
}

function MemoCreateForm({ attachedObjectType, handleCreateMemo: handleCreateMemo }: MemoCreateFormProps) {
  // global client state
  const { user } = useAuth();

  // local state
  const [formData, setFormData] = useState<MemoFormValues>({
    title: `My new ${attachedObjectType} memo`,
    content: "",
    content_json: "",
  });

  const handleTitleChange = useCallback((title: string) => {
    setFormData((oldFormData) => ({
      ...oldFormData,
      title,
    }));
  }, []);

  const handleContentChange = useCallback((content: string, contentJson: string) => {
    setFormData((oldFormData) => ({
      ...oldFormData,
      content,
      content_json: contentJson,
    }));
  }, []);

  const handleSave = useCallback(() => {
    handleCreateMemo(formData);
  }, [handleCreateMemo, formData]);

  if (!user) return null;

  return (
    <DialogContent className="h100 myFlexContainer" sx={{ p: 0 }}>
      <Toolbar disableGutters variant="dense" sx={{ justifyContent: "space-between" }}>
        <IconButton onClick={handleSave} color="success">
          <SaveIcon />
        </IconButton>
        <EditableTypography variant="h6" value={formData.title} onChange={handleTitleChange} whiteColor={false} />
        <Typography minWidth={40}></Typography>
      </Toolbar>
      <Divider />
      <MemoBlockEditorView initialContentJson="" onChange={handleContentChange} debounce={500} editable={true} />
    </DialogContent>
  );
}

export default memo(MemoCreateForm);
