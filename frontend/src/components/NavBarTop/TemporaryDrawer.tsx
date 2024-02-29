import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GavelIcon from "@mui/icons-material/Gavel";
import InfoIcon from "@mui/icons-material/Info";
import MenuIcon from "@mui/icons-material/Menu";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { OpenAPI } from "../../api/openapi/core/OpenAPI.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { useAuth } from "../../auth/useAuth.ts";
import ExporterListItemButton from "../../features/Exporter/ExporterListItemButton.tsx";

type Anchor = "top" | "left" | "bottom" | "right";

export default function TemporaryDrawer() {
  const { loginStatus } = useAuth();

  const [state, setState] = useState({
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
      className="h100"
    >
      <List className="h100">
        {loginStatus === LoginStatus.LOGGED_IN && (
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
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/settings">
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>
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

        <ListItem disablePadding>
          <ListItemButton component={Link} href="https://github.com/uhh-lt/dwts/wiki" target="_blank">
            <ListItemIcon>
              <AutoStoriesIcon />
            </ListItemIcon>
            <ListItemText primary="Wiki" />
          </ListItemButton>
        </ListItem>

        <ExporterListItemButton />

        <ListItem sx={{ position: "absolute", bottom: 0 }}>
          <ListItemText primary={`Version ${OpenAPI.VERSION}`} />
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
