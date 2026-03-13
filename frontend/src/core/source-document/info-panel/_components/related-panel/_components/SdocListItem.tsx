import { SdocHooks } from "@api/hooks/SdocHooks";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { DocTypeIcons, getIconComponent } from "@utils/icons/iconUtils";
import { memo } from "react";

interface SdocListItemProps {
  sdocId: number;
}

export const SdocListItem = memo(
  ({ sdocId, ...props }: SdocListItemProps & Omit<ListItemButtonProps, "disablePadding">) => {
    // query (global server state)
    const sdoc = SdocHooks.useGetDocument(sdocId);

    return (
      <ListItemButton component={Link} to="../annotation/$sdocId" params={{ sdocId }} {...props}>
        {sdoc.isSuccess ? (
          <>
            <ListItemIcon>{getIconComponent(DocTypeIcons[sdoc.data.doctype])}</ListItemIcon>
            <ListItemText primary={sdoc.data.name} />
          </>
        ) : sdoc.isError ? (
          <ListItemText primary={sdoc.error.message} />
        ) : sdoc.isLoading ? (
          <ListItemText primary="Loading..." />
        ) : null}
      </ListItemButton>
    );
  },
);
