import { ListItem, ListItemButton, ListItemIcon, ListItemProps, ListItemText } from "@mui/material";
import { memo } from "react";
import { Link } from "react-router-dom";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { docTypeToIcon } from "../../../../utils/icons/docTypeToIcon.tsx";

interface SdocListItemProps {
  sdocId: number;
}

function SdocListItem({ sdocId, ...props }: SdocListItemProps & Omit<ListItemProps, "disablePadding">) {
  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);

  return (
    <ListItem disablePadding {...props}>
      {sdoc.isSuccess ? (
        <ListItemButton component={Link} to={`/project/${sdoc.data.project_id}/annotation/${sdoc.data.id}`}>
          <ListItemIcon>{docTypeToIcon[sdoc.data.doctype]}</ListItemIcon>
          <ListItemText primary={sdoc.data.name ? sdoc.data.name : sdoc.data.filename} />
        </ListItemButton>
      ) : sdoc.isError ? (
        <ListItemText primary={sdoc.error.message} />
      ) : sdoc.isLoading ? (
        <ListItemText primary="Loading..." />
      ) : null}
    </ListItem>
  );
}

export default memo(SdocListItem);
