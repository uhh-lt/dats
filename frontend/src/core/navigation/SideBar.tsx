import { OpenAPI } from "@api/core/OpenAPI";
import { getIconComponent, Icon } from "@components/icons";
import { useAuth } from "@core/auth";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import {
  Box,
  Card,
  CardContent,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusHooks";
import { useLocation } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { LinkListItemButton, LinkMenuItem } from "./links";
import { formatNavigationShortcut } from "./navigationEntries";
import { NavigationRoute, NavigationShortcut } from "./navigationTypes";
import { useTabNavigate } from "./tabs";
import { useEnabledNavigationEntries } from "./useNavigationEntries";
import { WebSocketStatusIndicator } from "./WebSocketStatusIndicator";

const PROJECT_ROUTE_PREFIX = "/project/$projectId";

// Perspectives has always been highlighted lighter than the other entries.
const SELECTED_COLOR_OVERRIDES: Record<string, string> = {
  perspectives: "rgba(0, 0, 0, 0.08)",
};

function withShortcutHint(label: string, shortcut: NavigationShortcut) {
  return `${label} (${formatNavigationShortcut(shortcut)})`;
}

interface ShortcutLabelProps {
  title: string;
  shortcut: NavigationShortcut;
}

/** Underlines the first letter of the title that matches a single-key shortcut; chords are shown in the tooltip. */
function ShortcutLabel({ title, shortcut }: ShortcutLabelProps) {
  const index = typeof shortcut === "string" ? title.toLowerCase().indexOf(shortcut.toLowerCase()) : -1;
  if (index < 0) return title;
  return (
    <>
      {title.slice(0, index)}
      <span style={{ textDecoration: "underline" }}>{title[index]}</span>
      {title.slice(index + 1)}
    </>
  );
}

interface SideBarProps {
  projectId?: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function SideBar({ projectId, isExpanded, onToggle }: SideBarProps) {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const openProjectSettingsDialog = useOpenDialog("projectSettings");
  const tabNavigate = useTabNavigate();
  const searchEntries = useEnabledNavigationEntries("search");
  const mainEntries = useEnabledNavigationEntries("main");
  const toolsEntries = useEnabledNavigationEntries("tools");

  // Memoize isActive function
  const isActive = useCallback(
    (path: string) => {
      return location.pathname.includes(path);
    },
    [location.pathname],
  );

  // Tools menu state and handlers
  const [toolsMenuAnchorEl, setToolsMenuAnchorEl] = useState<HTMLElement | null>(null);
  const openToolsMenu = Boolean(toolsMenuAnchorEl);

  const handleToolsMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setToolsMenuAnchorEl(event.currentTarget);
  }, []);

  const handleToolsMenuClose = useCallback(() => {
    setToolsMenuAnchorEl(null);
  }, []);

  // Search menu state and handlers
  const [searchMenuAnchorEl, setSearchMenuAnchorEl] = useState<HTMLElement | null>(null);
  const openSearchMenu = Boolean(searchMenuAnchorEl);

  const handleSearchMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSearchMenuAnchorEl(event.currentTarget);
  }, []);

  const handleSearchMenuClose = useCallback(() => {
    setSearchMenuAnchorEl(null);
  }, []);

  const handleOpenSearchTab = useCallback(
    (to: NavigationRoute) => {
      if (!projectId) {
        return;
      }

      tabNavigate({ to, params: { projectId } });
      handleSearchMenuClose();
    },
    [handleSearchMenuClose, projectId, tabNavigate],
  );

  // User menu state and handlers
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(userMenuAnchorEl);
  const id = open ? "user-profile-popover" : undefined;

  const handleUserMenuClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchorEl(null);
  }, []);

  const selectedColor = "rgba(0, 0, 0, 0.5)";

  return (
    <Drawer
      variant="permanent"
      sx={(theme) => ({
        width: isExpanded ? 200 : 49,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isExpanded ? 200 : 49,
          boxSizing: "border-box",
          overflowX: "hidden",
          borderRight: "1px solid",
          borderColor: theme.palette.primary.dark,
          // transition: "width 0.2s ease-in-out",
        },
      })}
    >
      <Stack
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          color: "primary.contrastText",
          backgroundColor: "primary.main",
        }}
      >
        <List sx={{ py: 0 }}>
          <ListItem disablePadding sx={{ display: "block" }}>
            <ListItemButton
              onClick={onToggle}
              sx={{
                minHeight: 48,
                justifyContent: isExpanded ? "initial" : "center",
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isExpanded ? 3 : "auto",
                  justifyContent: "center",
                  color: "primary.contrastText",
                }}
              >
                <MenuIcon />
              </ListItemIcon>
              {isExpanded && (
                <Typography variant="h6" sx={{ textDecoration: "none", color: "inherit" }}>
                  DATS
                </Typography>
              )}
            </ListItemButton>
          </ListItem>
        </List>

        <Divider sx={{ borderColor: "primary.dark" }} />

        {/* Main navigation section */}
        {projectId && (
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Search in Corpus (⌘⇧S)" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  onClick={handleSearchMenuClick}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("search") ? selectedColor : "transparent",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isExpanded ? 3 : "auto",
                      justifyContent: "center",
                      color: "primary.contrastText",
                    }}
                  >
                    {getIconComponent(Icon.SEARCH)}
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText>
                      <span style={{ textDecoration: "underline" }}>S</span>earch
                    </ListItemText>
                  )}
                </ListItemButton>
              </Tooltip>
              <Menu
                anchorEl={searchMenuAnchorEl}
                open={openSearchMenu}
                onClose={handleSearchMenuClose}
                onClick={handleSearchMenuClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
              >
                {searchEntries.map((entry) => (
                  <MenuItem key={entry.id} onClick={() => handleOpenSearchTab(entry.to)}>
                    <ListItemIcon>{getIconComponent(entry.icon)}</ListItemIcon>
                    <ListItemText>{withShortcutHint(entry.title, entry.shortcut)}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </ListItem>

            {mainEntries.map((entry) => (
              <ListItem key={entry.id} disablePadding sx={{ display: "block" }}>
                <Tooltip
                  title={withShortcutHint(entry.title, entry.shortcut)}
                  placement="right"
                  arrow
                  disableHoverListener={isExpanded}
                >
                  <LinkListItemButton
                    to={entry.to}
                    params={{ projectId }}
                    sx={{
                      minHeight: 48,
                      justifyContent: isExpanded ? "initial" : "center",
                      px: 2.5,
                      bgcolor: isActive(entry.to.replace(PROJECT_ROUTE_PREFIX, ""))
                        ? (SELECTED_COLOR_OVERRIDES[entry.id] ?? selectedColor)
                        : "transparent",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: isExpanded ? 3 : "auto",
                        justifyContent: "center",
                        color: "primary.contrastText",
                      }}
                    >
                      {getIconComponent(entry.icon)}
                    </ListItemIcon>
                    {isExpanded && (
                      <ListItemText>
                        <ShortcutLabel title={entry.title} shortcut={entry.shortcut} />
                      </ListItemText>
                    )}
                  </LinkListItemButton>
                </Tooltip>
              </ListItem>
            ))}

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Tools" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  onClick={handleToolsMenuClick}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/tools") ? selectedColor : "transparent",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isExpanded ? 3 : "auto",
                      justifyContent: "center",
                      color: "primary.contrastText",
                    }}
                  >
                    {getIconComponent(Icon.TOOLS)}
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Tools" />}
                </ListItemButton>
              </Tooltip>
              <Menu
                anchorEl={toolsMenuAnchorEl}
                open={openToolsMenu}
                onClose={handleToolsMenuClose}
                onClick={handleToolsMenuClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
              >
                {toolsEntries.map((entry) => (
                  <LinkMenuItem key={entry.id} to={entry.to} params={{ projectId }}>
                    <ListItemIcon>{getIconComponent(entry.icon)}</ListItemIcon>
                    <ListItemText primary={withShortcutHint(entry.title, entry.shortcut)} />
                  </LinkMenuItem>
                ))}
              </Menu>
            </ListItem>
          </List>
        )}
        <Box sx={{ flexGrow: 1 }} />

        {/* Bottom section with settings and user profile */}
        <List sx={{ py: 1 }}>
          <ListItem disablePadding sx={{ display: "block" }}>
            <Tooltip title="Projects" placement="right" arrow disableHoverListener={isExpanded}>
              <LinkListItemButton
                to="/projects"
                sx={{
                  minHeight: 48,
                  justifyContent: isExpanded ? "initial" : "center",
                  px: 2.5,
                  bgcolor: isActive("/projects") ? selectedColor : "transparent",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isExpanded ? 3 : "auto",
                    justifyContent: "center",
                    color: "primary.contrastText",
                  }}
                >
                  <HomeIcon />
                </ListItemIcon>
                {isExpanded && <ListItemText primary="Projects" />}
              </LinkListItemButton>
            </Tooltip>
          </ListItem>

          <ListItem disablePadding sx={{ display: "block" }}>
            <Tooltip title="Wiki (⌘⇧W)" placement="right" arrow disableHoverListener={isExpanded}>
              <ListItemButton
                component="a"
                href="https://dats.science"
                target="_blank"
                sx={{
                  minHeight: 48,
                  justifyContent: isExpanded ? "initial" : "center",
                  px: 2.5,
                  backgroundColor: "primary.main",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: isExpanded ? 3 : "auto",
                    justifyContent: "center",
                    color: "primary.contrastText",
                  }}
                >
                  {getIconComponent(Icon.WIKI)}
                </ListItemIcon>
                {isExpanded && (
                  <ListItemText>
                    <span style={{ textDecoration: "underline" }}>W</span>iki
                  </ListItemText>
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {!!projectId && (
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Settings (⌘⇧,)" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  onClick={() => openProjectSettingsDialog()}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    backgroundColor: "primary.main",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isExpanded ? 3 : "auto",
                      justifyContent: "center",
                      color: "primary.contrastText",
                    }}
                  >
                    {getIconComponent(Icon.SETTINGS)}
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Settings" />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )}

          {isAuthenticated && user && (
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip
                title={user.first_name + " " + user.last_name}
                placement="right"
                arrow
                disableHoverListener={isExpanded}
              >
                <ListItemButton
                  onClick={handleUserMenuClick}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/me") ? selectedColor : "transparent",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isExpanded ? 3 : "auto",
                      justifyContent: "center",
                      color: "primary.contrastText",
                    }}
                  >
                    {getIconComponent(Icon.USER)}
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary={user.first_name + " " + user.last_name} />}
                </ListItemButton>
              </Tooltip>
              <Popover
                id={id}
                open={open}
                anchorEl={userMenuAnchorEl}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
              >
                <Card sx={{ minWidth: 275 }}>
                  <CardContent>
                    <Stack>
                      <Typography align="center" variant="h2">
                        <AccountCircleIcon fontSize="inherit" />
                      </Typography>
                      <Typography align="center" variant="h6">
                        {user.first_name} {user.last_name}
                      </Typography>
                      <Typography align="center" variant="body1" style={{ color: "slategrey" }}>
                        {user.email}
                      </Typography>
                    </Stack>
                  </CardContent>
                  <List disablePadding>
                    <ListItem disablePadding>
                      <LinkListItemButton to={"/me"} onClick={handleUserMenuClose}>
                        <ListItemIcon>
                          <AccountBoxIcon />
                        </ListItemIcon>
                        <ListItemText primary="View Profile" />
                      </LinkListItemButton>
                    </ListItem>
                    <Divider />
                    <ListItem disablePadding color="red">
                      <ListItemButton onClick={() => logout()} color="error">
                        <ListItemIcon>
                          <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText primary="Logout" />
                      </ListItemButton>
                    </ListItem>
                  </List>
                </Card>
              </Popover>
            </ListItem>
          )}

          <ListItem disablePadding sx={{ mt: 2, display: "block" }}>
            <ListItemText
              slotProps={{
                primary: {
                  fontSize: "0.75rem",
                  textAlign: "center",
                },
              }}
              primary={`${OpenAPI.VERSION}`}
            />
          </ListItem>
          <ListItem disablePadding sx={{ display: "block" }}>
            <WebSocketStatusIndicator isExpanded={isExpanded} />
          </ListItem>
        </List>
      </Stack>
    </Drawer>
  );
}
