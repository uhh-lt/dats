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
import { memo, useCallback, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { OpenAPI } from "../../api/openapi/core/OpenAPI.ts";
import { UserRead } from "../../api/openapi/models/UserRead.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

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
  const dispatch = useAppDispatch();

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

  // Settings handler
  const handleSettingsClick = useCallback(() => {
    dispatch(CRUDDialogActions.openProjectSettings());
  }, [dispatch]);

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
        {isInProject && (
          <List sx={{ py: 0 }}>
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Search (⌘⇧S)" placement="right" arrow disableHoverListener={isExpanded}>
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
                <MenuItem component={Link} to={`/project/${projectId}/search`}>
                  <ListItemIcon>{getIconComponent(Icon.DOCUMENT_SEARCH)}</ListItemIcon>
                  <ListItemText>Document Search</ListItemText>
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/imagesearch`}>
                  <ListItemIcon>{getIconComponent(Icon.IMAGE_SEARCH)}</ListItemIcon>
                  <ListItemText>Image Search</ListItemText>
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/sentencesearch`}>
                  <ListItemIcon>{getIconComponent(Icon.SENTENCE_SEARCH)}</ListItemIcon>
                  <ListItemText>Sentence Search</ListItemText>
                </MenuItem>
              </Menu>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Perspectives (⌘M)" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  component={Link}
                  to={`/project/${projectId}/perspectives`}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/perspectives") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    {getIconComponent(Icon.PERSPECTIVES)}
                  </ListItemIcon>
                  {isExpanded && <ListItemText>Perspectives</ListItemText>}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Annotation (⌘⇧A)" placement="right" arrow disableHoverListener={isExpanded}>
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
                    {getIconComponent(Icon.ANNOTATION)}
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText>
                      <span style={{ textDecoration: "underline" }}>A</span>nnotation
                    </ListItemText>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Analysis (⌘⇧Y)" placement="right" arrow disableHoverListener={isExpanded}>
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
                    {getIconComponent(Icon.ANALYSIS)}
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText>
                      Anal<span style={{ textDecoration: "underline" }}>y</span>sis
                    </ListItemText>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Classifier (⌘⇧C)" placement="right" arrow disableHoverListener={isExpanded}>
                <ListItemButton
                  component={Link}
                  to={`/project/${projectId}/classifier`}
                  sx={{
                    minHeight: 48,
                    justifyContent: isExpanded ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive("/classifier") ? "rgba(0, 0, 0, 0.08)" : "transparent",
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
                    {getIconComponent(Icon.CLASSIFIER)}
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText>
                      <span style={{ textDecoration: "underline" }}>C</span>lassifier
                    </ListItemText>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Whiteboard (⌘⇧B)" placement="right" arrow disableHoverListener={isExpanded}>
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
                    {getIconComponent(Icon.WHITEBOARD)}
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText>
                      White<span style={{ textDecoration: "underline" }}>b</span>oard
                    </ListItemText>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Logbook (⌘⇧L)" placement="right" arrow disableHoverListener={isExpanded}>
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
                    {getIconComponent(Icon.LOGBOOK)}
                  </ListItemIcon>
                  {isExpanded && (
                    <ListItemText>
                      <span style={{ textDecoration: "underline" }}>L</span>ogbook
                    </ListItemText>
                  )}
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
                <MenuItem component={Link} to={`/project/${projectId}/tools/ml-automation`}>
                  <ListItemIcon>{getIconComponent(Icon.ML_AUTOMATION)}</ListItemIcon>
                  <ListItemText primary="ML Automation" />
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/tools/duplicate-finder`}>
                  <ListItemIcon>{getIconComponent(Icon.DUPLICATE_FINDER)}</ListItemIcon>
                  <ListItemText primary="Duplicate Finder" />
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/tools/document-sampler`}>
                  <ListItemIcon>{getIconComponent(Icon.DOCUMENT_SAMPLER)}</ListItemIcon>
                  <ListItemText primary="Document Sampler" />
                </MenuItem>
                <MenuItem component={Link} to={`/project/${projectId}/tools/health`}>
                  <ListItemIcon>{getIconComponent(Icon.HEALTH)}</ListItemIcon>
                  <ListItemText primary="Document Health (⌘⇧H)" />
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
            <Tooltip title="Wiki (⌘⇧W)" placement="right" arrow disableHoverListener={isExpanded}>
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

          {isInProject && (
            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Settings (⌘⇧,)" placement="right" arrow disableHoverListener={isExpanded}>
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
                    {getIconComponent(Icon.SETTINGS)}
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

export default memo(SideBar);
