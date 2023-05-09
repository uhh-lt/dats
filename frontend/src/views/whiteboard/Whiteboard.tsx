import React, { useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import "@toast-ui/editor/dist/toastui-editor.css";
import ProjectHooks from "../../api/ProjectHooks";
import { AppBarContext } from "../../layouts/TwoBarLayout";
import { Box, Grid, Portal, Toolbar, Typography } from "@mui/material";
import MemoFlow from "./MemoFlow";

function Whiteboard() {
  const appBarContainerRef = useContext(AppBarContext);

  // global state
  const { user } = useAuth();

  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  const userMemos = ProjectHooks.useGetAllUserMemos(parseInt(projectId), user.data!.id);

  // effects
  useEffect(() => {}, []);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Project Whiteboard
        </Typography>
      </Portal>
      {userMemos.isSuccess && userMemos.data && <MemoFlow memos={userMemos.data} />}
    </>
  );
}

export default Whiteboard;
