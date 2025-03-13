import { Box, CssBaseline } from "@mui/material";
import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth.ts";
import CodeCreateDialog from "../components/Code/CodeCreateDialog.tsx";
import ConfirmationDialog from "../components/ConfirmationDialog/ConfirmationDialog.tsx";
import { CRUDDialogActions } from "../components/dialogSlice.ts";
import ExporterDialog from "../components/Exporter/ExporterDialog.tsx";
import LLMDialog from "../components/LLMDialog/LLMDialog.tsx";
import MemoDialog from "../components/Memo/MemoDialog/MemoDialog.tsx";
import ProjectIdUpdater from "../components/Project/ProjectIdUpdater.tsx";
import ProjectSettingsDialog from "../components/ProjectSettings/ProjectSettingsDialog.tsx";
import QuickCommandMenu from "../components/QuickCommandMenu/QuickCommandMenu.tsx";
import SnackbarDialog from "../components/SnackbarDialog/SnackbarDialog.tsx";
import TagCreateDialog from "../components/Tag/TagCreateDialog.tsx";
import { useAppDispatch } from "../plugins/ReduxHooks.ts";
import DialMenu from "./DialMenu/DialMenu.tsx";
import "./Layout.css";
import SideBar from "./SideBar/SideBar.tsx";
import TabBar from "./TabBar/TabBar.tsx";

function SideBarLayout({ isInProject }: { isInProject: boolean }) {
  const { projectId } = useParams() as { projectId: string };
  const { loginStatus, logout, user } = useAuth();
  const dispatch = useAppDispatch();

  // sidebar state
  const [isExpanded, setSidebarExpanded] = useState(false);
  const handleToggleSidebar = () => {
    setSidebarExpanded(!isExpanded);
  };

  // Setup command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        dispatch(CRUDDialogActions.toggleQuickCommandMenu());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  return (
    <>
      <CssBaseline />
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "row" }}>
        <SideBar
          isExpanded={isExpanded}
          onToggle={handleToggleSidebar}
          loginStatus={loginStatus}
          user={user}
          handleLogout={logout}
          isInProject={isInProject}
        />
        <Box
          sx={{
            height: "100%",
            width: isExpanded ? "calc(100vw - 200px)" : "calc(100vw - 49px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {isInProject && <TabBar />}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
      {parseInt(projectId) && (
        <>
          <ProjectIdUpdater />
          <DialMenu />
          <MemoDialog />
          <SnackbarDialog />
          <TagCreateDialog />
          <CodeCreateDialog />
          <ConfirmationDialog />
          <ExporterDialog />
          <ProjectSettingsDialog />
          <LLMDialog />
          <QuickCommandMenu />
        </>
      )}
    </>
  );
}

export default SideBarLayout;
