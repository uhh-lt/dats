import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import SdocHooks from "../../../../api/SdocHooks.ts";
import { docTypeToIcon } from "../../../../utils/icons/docTypeToIcon.tsx";

interface SdocListItemProps {
  sdocId: number;
}

function SdocListItem({ sdocId, ...props }: SdocListItemProps & Omit<ListItemButtonProps, "disablePadding">) {
  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);

  return (
    <ListItemButton component={Link} to="../annotation/$sdocId" params={{ sdocId }} {...props}>
      {sdoc.isSuccess ? (
        <>
          <ListItemIcon>{docTypeToIcon[sdoc.data.doctype]}</ListItemIcon>
          <ListItemText primary={sdoc.data.name} />
        </>
      ) : sdoc.isError ? (
        <ListItemText primary={sdoc.error.message} />
      ) : sdoc.isLoading ? (
        <ListItemText primary="Loading..." />
      ) : null}
    </ListItemButton>
  );
}

export default memo(SdocListItem);
