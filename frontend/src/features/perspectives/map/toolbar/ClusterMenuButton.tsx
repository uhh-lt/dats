import { PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { memo, MouseEventHandler, useCallback, useState } from "react";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";
import { ClusterMenu } from "./ClusterMenu.tsx";

interface ClusterMenuButtonProps {
  aspectId: number;
  popoverOrigin?: PopoverOrigin;
  selectedSdocIds: number[];
  colorScheme: string[];
}

export const ClusterMenuButton = memo(
  ({ aspectId, popoverOrigin, selectedSdocIds, colorScheme }: ClusterMenuButtonProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback((event) => {
      setAnchorEl(event.currentTarget);
    }, []);

    return (
      <>
        <Tooltip title="Change Cluster">
          <IconButton onClick={handleClick}>{getIconComponent(Icon.CLUSTERS)}</IconButton>
        </Tooltip>
        <ClusterMenu
          sdocIds={selectedSdocIds}
          aspectId={aspectId}
          anchorEl={anchorEl}
          setAnchorEl={setAnchorEl}
          popoverOrigin={popoverOrigin}
          colorScheme={colorScheme}
        />
      </>
    );
  },
);
