import AddIcon from "@mui/icons-material/Add";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
// import { openTagCreateDialog } from "../../../../../features/CrudDialog/Tag/TagCreateDialog";
import { KEYWORD_TAGS } from "../../../../../utils/GlobalConstants";
import { openTreeDataCreateDialog } from "../../../../../features/CrudDialog/TreeData/TreeDataCreateDialog";

interface DataTreeActionButtonCreateProps {
  treeDataName: string;
  dataType: string;
}

/**
 * A button that sends the 'open-tag' event to open the TagCreationDialog
 * @param tagName The name of the DocumentTag to be created. The button will display the name, and the TagCreationDialog's form will be pre-filled with this name.
 */
function DataTreeMenuCreateButton({
  treeDataName,
  dataType,
  ...props
}: DataTreeActionButtonCreateProps & ListItemButtonProps) {
  return (
    <ListItemButton onClick={() => openTreeDataCreateDialog({ treeDataName })} {...props}>
      <ListItemIcon>
        <AddIcon />
      </ListItemIcon>
      <ListItemText
        primary={
          treeDataName.length > 0
            ? `"${treeDataName}" (Create new)`
            : "Create new " + (dataType === KEYWORD_TAGS ? "Tags" : "Codes")
        }
      />
    </ListItemButton>
  );
}

export default DataTreeMenuCreateButton;
