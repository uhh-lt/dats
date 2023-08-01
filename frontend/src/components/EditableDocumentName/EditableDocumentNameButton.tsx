import EditIcon from "@mui/icons-material/Edit";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import { EditableDocumentNameHandle } from "./EditableDocumentName";

interface EditableDocumentNameButtonProps {
  editableDocumentNameHandle: EditableDocumentNameHandle | null;
}

function EditableDocumentNameButton({
  editableDocumentNameHandle,
  ...props
}: EditableDocumentNameButtonProps & Omit<IconButtonProps, "onClick">) {
  return (
    <Tooltip title="Edit name">
      <IconButton onClick={() => editableDocumentNameHandle?.toggle()} {...props}>
        <EditIcon />
      </IconButton>
    </Tooltip>
  );
}

export default EditableDocumentNameButton;
