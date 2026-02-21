import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import * as React from "react";
import { SdocHooks } from "../../../../../api/SdocHooks.ts";
import { UserRenderer } from "../../../../../core/user/renderer/UserRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../annoSlice.ts";

interface CompareWithButtonProps {
  sdocId: number;
}

export function CompareWithButton({ sdocId }: CompareWithButtonProps) {
  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);

  // global client state (redux)
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const dispatch = useAppDispatch();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleOpenClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleUserClick = (userId: number) => {
    dispatch(AnnoActions.compareWithUser(userId));
    handleClose();
  };

  return (
    <div>
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleOpenClick}
      >
        Compare with ...
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        {annotatorUserIds.data
          ?.filter((userId) => userId !== visibleUserId)
          .map((userId) => (
            <MenuItem key={userId} onClick={() => handleUserClick(userId)}>
              <UserRenderer user={userId} />
            </MenuItem>
          ))}
      </Menu>
    </div>
  );
}
