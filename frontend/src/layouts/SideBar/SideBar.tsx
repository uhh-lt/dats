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
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLocation } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { OpenAPI } from "../../api/openapi/core/OpenAPI.ts";
import { LoginStatus } from "../../auth/LoginStatus.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { CRUDDialogActions } from "../../components/dialogSlice.ts";
import { LinkListItemButton } from "../../components/MUI/LinkListItemButton.tsx";
import { LinkMenuItem } from "../../components/MUI/LinkMenuItem.tsx";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

interface SideBarProps {
  projectId?: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function SideBar({ projectId, isExpanded, onToggle }: SideBarProps) {
  const { loginStatus, logout, user } = useAuth();
  const location = useLocation();
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
        {projectId && (
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
                <LinkMenuItem to="/project/$projectId/search" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.DOCUMENT_SEARCH)}</ListItemIcon>
                  <ListItemText>Document Search</ListItemText>
                </LinkMenuItem>
                <LinkMenuItem to="/project/$projectId/imagesearch" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.IMAGE_SEARCH)}</ListItemIcon>
                  <ListItemText>Image Search</ListItemText>
                </LinkMenuItem>
                <LinkMenuItem to="/project/$projectId/sentencesearch" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.SENTENCE_SEARCH)}</ListItemIcon>
                  <ListItemText>Sentence Search</ListItemText>
                </LinkMenuItem>
              </Menu>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Perspectives (⌘M)" placement="right" arrow disableHoverListener={isExpanded}>
                <LinkListItemButton
                  to="/project/$projectId/perspectives"
                  params={{ projectId }}
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
                </LinkListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Annotation (⌘⇧A)" placement="right" arrow disableHoverListener={isExpanded}>
                <LinkListItemButton
                  to="/project/$projectId/annotation"
                  params={{ projectId }}
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
                </LinkListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Analysis (⌘⇧Y)" placement="right" arrow disableHoverListener={isExpanded}>
                <LinkListItemButton
                  to="/project/$projectId/analysis"
                  params={{ projectId }}
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
                </LinkListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Classifier (⌘⇧C)" placement="right" arrow disableHoverListener={isExpanded}>
                <LinkListItemButton
                  to="/project/$projectId/classifier"
                  params={{ projectId }}
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
                </LinkListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Whiteboard (⌘⇧B)" placement="right" arrow disableHoverListener={isExpanded}>
                <LinkListItemButton
                  to="/project/$projectId/whiteboard"
                  params={{ projectId }}
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
                </LinkListItemButton>
              </Tooltip>
            </ListItem>

            <ListItem disablePadding sx={{ display: "block" }}>
              <Tooltip title="Logbook (⌘⇧L)" placement="right" arrow disableHoverListener={isExpanded}>
                <LinkListItemButton
                  to="/project/$projectId/logbook"
                  params={{ projectId }}
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
                </LinkListItemButton>
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
                <LinkMenuItem to="/project/$projectId/tools/ml-automation" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.ML_AUTOMATION)}</ListItemIcon>
                  <ListItemText primary="ML Automation" />
                </LinkMenuItem>
                <LinkMenuItem to="/project/$projectId/tools/duplicate-finder" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.DUPLICATE_FINDER)}</ListItemIcon>
                  <ListItemText primary="Duplicate Finder" />
                </LinkMenuItem>
                <LinkMenuItem to="/project/$projectId/tools/document-sampler" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.DOCUMENT_SAMPLER)}</ListItemIcon>
                  <ListItemText primary="Document Sampler" />
                </LinkMenuItem>
                <LinkMenuItem to="/project/$projectId/tools/health" params={{ projectId }}>
                  <ListItemIcon>{getIconComponent(Icon.HEALTH)}</ListItemIcon>
                  <ListItemText primary="Document Health (⌘⇧H)" />
                </LinkMenuItem>
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
              </LinkListItemButton>
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

          {!!projectId && (
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
                      <LinkListItemButton to={"/me"}>
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
        </List>
      </Stack>
    </Drawer>
  );
}

export default SideBar;
