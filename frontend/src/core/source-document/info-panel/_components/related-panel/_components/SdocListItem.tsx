import { DocTypeIcons, getIconComponent } from "@components/icons";
import { LinkListItemButton } from "@core/navigation";
import { ListItemIcon, ListItemText } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { forwardRef, memo } from "react";
import { sdocQueries } from "../../../../api/sdocQueries";

interface SdocListItemProps {
  sdocId: number;
  projectId?: number;
  selected?: boolean;
}

export const SdocListItem = memo(
  forwardRef<HTMLAnchorElement, SdocListItemProps>(({ sdocId, projectId, selected }, ref) => {
    // query (global server state)
    const sdoc = useQuery(sdocQueries.detail(sdocId));

    if (projectId === undefined) {
      return null;
    }

    return (
      <LinkListItemButton
        ref={ref}
        to="/project/$projectId/annotation/$sdocId"
        params={{ projectId, sdocId }}
        selected={selected}
      >
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
      </LinkListItemButton>
    );
  }),
);
