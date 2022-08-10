import { Divider, IconButton, ListItemText, Menu, MenuItem } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import * as React from "react";
import CodeSetCreationInput from "./CodeSetCreationInput";
import { CodeRead } from "../../../api/openapi";

interface CodeSetMenuProps {
  projectId: number;
  userId: number;
  codeSets: CodeRead[];
  onOpenCodeSet: (codeSet: CodeRead) => void;
}

function CodeSetMenu({ projectId, userId, codeSets, onOpenCodeSet }: CodeSetMenuProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (codeSet: CodeRead) => {
    handleClose();
    onOpenCodeSet(codeSet);
  };

  return (
    <React.Fragment>
      <IconButton size="large" edge="end" color="inherit" onClick={handleMenu}>
        <FolderIcon />
      </IconButton>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        keepMounted
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {codeSets.map((code) => (
          <MenuItem key={code.id} onClick={() => handleMenuItemClick(code)}>
            <ListItemText>
              {code.name} {code.id}
            </ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <CodeSetCreationInput projectId={projectId} userId={userId} isMenuOpen={Boolean(anchorEl)} />
      </Menu>
    </React.Fragment>
  );
}

export default CodeSetMenu;
