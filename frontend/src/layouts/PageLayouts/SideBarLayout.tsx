import { Box, CssBaseline } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.ts";
import CodeCreateDialog from "../../components/Code/CodeCreateDialog.tsx";
import CodeEditDialog from "../../components/Code/CodeEditDialog.tsx";
import ConfirmationDialog from "../../components/ConfirmationDialog/ConfirmationDialog.tsx";
import DocumentUploadDialog from "../../components/DocumentUpload/DocumentUploadDialog.tsx";
import FolderCreateDialog from "../../components/Folder/FolderCreateDialog.tsx";
import FolderEditDialog from "../../components/Folder/FolderEditDialog.tsx";
import LLMDialog from "../../components/LLMDialog/LLMDialog.tsx";
import MemoDialog from "../../components/Memo/MemoDialog/MemoDialog.tsx";
import ProjectIdUpdater from "../../components/Project/ProjectIdUpdater.tsx";
import ProjectSettingsDialog from "../../components/ProjectSettings/ProjectSettingsDialog.tsx";
import QuickCommandMenu from "../../components/QuickCommandMenu/QuickCommandMenu.tsx";
import { ShortcutManager } from "../../components/ShortcutManager/ShortcutManager.tsx";
import SnackbarDialog from "../../components/SnackbarDialog/SnackbarDialog.tsx";
import TagCreateDialog from "../../components/Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../components/Tag/TagEditDialog.tsx";
import DialMenu from "../DialMenu/DialMenu.tsx";
import "../Layout.css";
import SideBar from "../SideBar/SideBar.tsx";
import TabBar from "../TabBar/TabBar.tsx";

function SideBarLayout() {
  const { projectId } = useParams() as { projectId: string | undefined };
  const { loginStatus, logout, user } = useAuth();

  // sidebar state
  const [isExpanded, setSidebarExpanded] = useState(false);
  const handleToggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => !prev);
  }, []);

  return (
    <>
      <CssBaseline />
      <ProjectIdUpdater />
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "row", backgroundColor: "grey.200" }}>
        <SideBar
          isExpanded={isExpanded}
          onToggle={handleToggleSidebar}
          loginStatus={loginStatus}
          user={user}
          handleLogout={logout}
          isInProject={!!projectId}
        />
        <Box
          sx={{
            height: "100%",
            width: isExpanded ? "calc(100vw - 200px)" : "calc(100vw - 49px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {!!projectId && <TabBar />}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "auto",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
      {projectId && (
        <>
          <DialMenu />
          <MemoDialog />
          <SnackbarDialog />
          <TagCreateDialog />
          <TagEditDialog />
          <FolderCreateDialog />
          <FolderEditDialog />
          <CodeCreateDialog />
          <CodeEditDialog />
          <ConfirmationDialog />
          <ProjectSettingsDialog />
          <DocumentUploadDialog />
          <LLMDialog />
          <QuickCommandMenu />
          <ShortcutManager />
        </>
      )}
    </>
  );
}

export default memo(SideBarLayout);
