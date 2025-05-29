import { PopoverOrigin } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React, { memo, useCallback, useState } from "react";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import TopicMenu from "./TopicMenu.tsx";

interface TopicMenuButtonProps {
  aspectId: number;
  popoverOrigin?: PopoverOrigin;
  selectedSdocIds: number[];
}

function TopicMenuButton({ aspectId, popoverOrigin, selectedSdocIds }: TopicMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  return (
    <>
      <Tooltip title="Change Topic">
        <IconButton onClick={handleClick}>{getIconComponent(Icon.TOPICS)}</IconButton>
      </Tooltip>
      <TopicMenu
        sdocIds={selectedSdocIds}
        aspectId={aspectId}
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        popoverOrigin={popoverOrigin}
      />
    </>
  );
}

export default memo(TopicMenuButton);
