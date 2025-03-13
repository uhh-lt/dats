import AccountBoxIcon from "@mui/icons-material/AccountBox";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import DescriptionIcon from "@mui/icons-material/Description";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import HomeIcon from "@mui/icons-material/Home";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import ShortTextIcon from "@mui/icons-material/ShortText";
import StackedBarChartIcon from "@mui/icons-material/StackedBarChart";
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
import { useState } from "react";
import { OpenAPI } from "../../api/openapi/core/OpenAPI.ts";

import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BarChartIcon from "@mui/icons-material/BarChart";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Link, useLocation, useParams } from "react-router-dom";
import { UserRead } from "../../api/openapi/models/UserRead.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";

interface SideBarProps {
  loginStatus: LoginStatus;
  user: UserRead | undefined;
  handleLogout: () => void;
  isInProject: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function SideBar({ isExpanded, onToggle, loginStatus, user, handleLogout, isInProject }: SideBarProps) {
  const location = useLocation();
  const { projectId } = useParams();

  // Check if a route is active
  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  // Toggle sidebar expansion
  const toggleSidebar = () => {
    onToggle();
  };

  // tools menu
  const [toolsMenuAnchorEl, setToolsMenuAnchorEl] = useState<HTMLElement | null>(null);
  const openToolsMenu = Boolean(toolsMenuAnchorEl);
  const handleToolsMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setToolsMenuAnchorEl(event.currentTarget);
  };
  const handleToolsMenuClose = () => {
    setToolsMenuAnchorEl(null);
  };

  // search menu
  const [searchMenuAnchorEl, setSearchMenuAnchorEl] = useState<HTMLElement | null>(null);
  const openSearchMenu = Boolean(searchMenuAnchorEl);
  const handleSearchMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setSearchMenuAnchorEl(event.currentTarget);
  };
  const handleSearchMenuClose = () => {
    setSearchMenuAnchorEl(null);
  };

  // user profile menu
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(userMenuAnchorEl);
  const id = open ? "user-profile-popover" : undefined;
  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };
  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  // project settings
  const dispatch = useAppDispatch();
  const handleSettingsClick = () => {
    dispatch(CRUDDialogActions.openProjectSettings());
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isExpanded ? 200 : 49,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isExpanded ? 200 : 49,
          boxSizing: "border-box",
          overflowX: "hidden",
          borderRight: "none",
          // transition: "width 0.2s ease-in-out",
        },
      }}
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
              onClick={toggleSidebar}
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

        <Divider />

        {/* Main navigation section */}
        {isInProject && (
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Search" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  onClick={handleSearchMenuClick}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("search") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    <SearchIcon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Search" />}
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
                <MenuItem component={Link} to={`/project/${projectId}/search`}>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText>Document Search</ListItemText>
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/imagesearch`}>
                  <ListItemIcon>
                    <ImageSearchIcon />
                  </ListItemIcon>
                  <ListItemText>Image Search</ListItemText>
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/sentencesearch`}>
                  <ListItemIcon>
                    <ShortTextIcon />
                  </ListItemIcon>
                  <ListItemText>Sentence Search</ListItemText>
                </MenuItem>
              </Menu>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Annotation" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  component={Link}
                  to={`/project/${projectId}/annotation`}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/annotation") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    <FormatColorTextIcon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Annotation" />}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Analysis" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  component={Link}
                  to={`/project/${projectId}/analysis`}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/analysis") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    <BarChartIcon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Analysis" />}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Whiteboard" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  component={Link}
                  to={`/project/${projectId}/whiteboard`}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/whiteboard") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    <AccountTreeIcon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Whiteboard" />}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Logbook" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  component={Link}
                  to={`/project/${projectId}/logbook`}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/logbook") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    <MenuBookIcon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Logbook" />}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Tools" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  onClick={handleToolsMenuClick}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/tools") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    <AutoAwesomeIcon />
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
                <MenuItem component={Link} to={`/project/${projectId}/tools/ml-automation`}>
                  <ListItemIcon>
                    <AutoAwesomeIcon />
                  </ListItemIcon>
                  <ListItemText primary="ML Automation" />
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/tools/duplicate-finder`}>
                  <ListItemIcon>
                    <FileCopyIcon />
                  </ListItemIcon>
                  <ListItemText primary="Duplicate Finder" />
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/tools/document-sampler`}>
                  <ListItemIcon>
                    <StackedBarChartIcon />
                  </ListItemIcon>
                  <ListItemText primary="Document Sampler" />
                </MenuItem>
              </Menu>
            </ListItem>
          </List>
        )}
        <Box sx={{ flexGrow: 1 }} />

        {/* Bottom section with settings and user profile */}
        <List sx={{ py: 1 }}>
          <ListItem disablePadding sx={{ display: "block" }}>
            <Tooltip title="Projects" placement="right" arrow disableHoverListener={isExpanded}>
              <ListItemButton
                component={Link}
                to="/projects"
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
                  <HomeIcon />
                </ListItemIcon>
                {isExpanded && <ListItemText primary="Projects" />}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          <ListItem disablePadding sx={{ display: "block" }}>
            <Tooltip title="Wiki" placement="right" arrow disableHoverListener={isExpanded}>
              <ListItemButton
                component="a"
                href="https://github.com/uhh-lt/dats/wiki"
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
                  <AutoStoriesIcon />
                </ListItemIcon>
                {isExpanded && <ListItemText primary="Wiki" />}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {isInProject && (
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Settings" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  onClick={handleSettingsClick}
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
                    <SettingsIcon />
                  </ListItemIcon>
                  {isExpanded && <ListItemText primary="Settings" />}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )}

          {loginStatus === LoginStatus.LOGGED_IN && user && (
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
                    <AccountCircleIcon />
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
                      <ListItemButton component={Link} to={"/me"}>
                        <ListItemIcon>
                          <AccountBoxIcon />
                        </ListItemIcon>
                        <ListItemText primary="View Profile" />
                      </ListItemButton>
                    </ListItem>
                    <Divider />
                    <ListItem disablePadding color="red">
                      <ListItemButton onClick={() => handleLogout()} color="error">
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
        </List>
      </Stack>
    </Drawer>
  );
}

export default SideBar;
