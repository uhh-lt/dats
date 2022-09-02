import React from "react";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import InfoIcon from "@mui/icons-material/Info";
import GavelIcon from "@mui/icons-material/Gavel";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";

type Anchor = "top" | "left" | "bottom" | "right";

export default function TemporaryDrawer() {
  const { isLoggedIn } = useAuth();

  const [state, setState] = React.useState({
    top: false,
    left: false,
    bottom: false,
    right: false,
  });

  const toggleDrawer = (anchor: Anchor, open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" || (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }

    setState({ ...state, [anchor]: open });
  };

  const list = (anchor: Anchor) => (
    <Box
      sx={{ width: anchor === "top" || anchor === "bottom" ? "auto" : 250 }}
      role="presentation"
      onClick={toggleDrawer(anchor, false)}
      onKeyDown={toggleDrawer(anchor, false)}
    >
      {/*<List>*/}
      {/*  <ListSubheader component="div">Corpora</ListSubheader>*/}
      {/*  <ImportDocumentListButton />*/}
      {/*</List>*/}
      <List>
        {isLoggedIn && (
          <>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/projects">
                <ListItemIcon>
                  <FactCheckIcon />
                </ListItemIcon>
                <ListItemText primary="Projects" />
              </ListItemButton>
            </ListItem>
            <Divider />
          </>
        )}

        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/about">
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="About" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton component={RouterLink} to="/imprint">
            <ListItemIcon>
              <GavelIcon />
            </ListItemIcon>
            <ListItemText primary="Imprint" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <React.Fragment>
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="menu"
        sx={{ mr: 2 }}
        onClick={toggleDrawer("left", true)}
      >
        <MenuIcon />
      </IconButton>
      <Drawer anchor="left" open={state["left"]} onClose={toggleDrawer("left", false)}>
        {list("left")}
      </Drawer>
    </React.Fragment>
  );
}
