import SaveIcon from "@mui/icons-material/Save";
import { DialogContent, Divider, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { memo, useCallback, useMemo, useState } from "react";
import { SubmitHandler } from "react-hook-form";
import { AttachedObjectType } from "../../../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationRead } from "../../../../api/openapi/models/BBoxAnnotationRead.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { MemoRead } from "../../../../api/openapi/models/MemoRead.ts";
import { ProjectRead } from "../../../../api/openapi/models/ProjectRead.ts";
import { SentenceAnnotationRead } from "../../../../api/openapi/models/SentenceAnnotationRead.ts";
import { SourceDocumentRead } from "../../../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationRead } from "../../../../api/openapi/models/SpanAnnotationRead.ts";
import { TagRead } from "../../../../api/openapi/models/TagRead.ts";
import { EditableTypography } from "../../../../components/EditableTypography.tsx";
import { useAuth } from "../../../../features/auth/useAuth.ts";
import { dateToLocaleString } from "../../../../utils/DateUtils.ts";
import { UserRenderer } from "../../../user/renderer/UserRenderer.tsx";
import { MemoActionMenu } from "../../action/MemoActionMenu.tsx";
import { MemoEditorView } from "../../editor/MemoEditorView.tsx";
import { AttachedObjectRenderer } from "../../renderer/AttachedObjectRenderer.tsx";

export interface MemoFormValues {
  title: string;
  content: string;
  content_json: string;
}

interface MemoDialogFormProps {
  attachedObject:
    | TagRead
    | SourceDocumentRead
    | CodeRead
    | SpanAnnotationRead
    | SentenceAnnotationRead
    | BBoxAnnotationRead
    | ProjectRead;
  attachedObjectType: AttachedObjectType;
  memo: MemoRead | undefined;
  handleCreateOrUpdateMemo: SubmitHandler<MemoFormValues>;
  onDeleteClick: () => void;
}

export const MemoDialogForm = memo(
  ({ memo, attachedObject, attachedObjectType, handleCreateOrUpdateMemo, onDeleteClick }: MemoDialogFormProps) => {
    // global client state
    const { user } = useAuth();

    // local state
    const [formData, setFormData] = useState<MemoFormValues>({
      title: memo?.title || `My new ${attachedObjectType} memo`,
      content: memo?.content || "",
      content_json: memo?.content_json || "",
    });

    const isEditable = useMemo(() => !memo || user?.id === memo?.user_id, [memo, user?.id]);

    const initialContentJson = useMemo(() => memo?.content_json || "", [memo?.content_json]);

    const lastModifiedDate = useMemo(() => {
      if (!memo?.updated) return "";
      const fullDate = dateToLocaleString(memo.updated);
      return fullDate.substring(0, fullDate.indexOf(","));
    }, [memo?.updated]);

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
      handleCreateOrUpdateMemo(formData);
    }, [handleCreateOrUpdateMemo, formData]);

    if (!user) return null;

    return (
      <DialogContent className="h100 myFlexContainer" sx={{ p: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" p={1}>
          <Typography>
            <AttachedObjectRenderer attachedObject={attachedObject} attachedObjectType={attachedObjectType} link />
          </Typography>
          <Typography variant="subtitle2" color="textDisabled" fontSize={12} flexShrink={0}>
            <UserRenderer user={memo?.user_id || user.id} />
          </Typography>
        </Stack>
        <Divider />
        <Toolbar disableGutters variant="dense" sx={{ justifyContent: "space-between" }}>
          <IconButton onClick={handleSave} color="success">
            <SaveIcon />
          </IconButton>
          {isEditable ? (
            <EditableTypography variant="h6" value={formData.title} onChange={handleTitleChange} whiteColor={false} />
          ) : (
            <Typography variant="h6">{formData.title}</Typography>
          )}
          <MemoActionMenu memo={memo} onDeleteClick={onDeleteClick} />
        </Toolbar>
        <Divider />
        <MemoEditorView
          initialContentJson={initialContentJson}
          onChange={handleContentChange}
          editable={isEditable}
          debounce={500}
        />
        {memo && (
          <Typography variant="subtitle2" color="textSecondary" fontSize={12} p={1}>
            {"Last modified: " + lastModifiedDate}
          </Typography>
        )}
      </DialogContent>
    );
  },
);
