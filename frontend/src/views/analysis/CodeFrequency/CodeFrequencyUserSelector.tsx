import { AppBar, AppBarProps, Toolbar } from "@mui/material";
import { useEffect } from "react";
import { useAuth } from "../../../auth/useAuth.ts";
import UserSelectorMulti from "../../../components/User/UserSelectorMulti.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { AnalysisActions } from "../analysisSlice.ts";

interface CodeFrequencyUserSelectorProps {
  projectId: number | undefined;
}

function CodeFrequencyUserSelector({ projectId, ...props }: CodeFrequencyUserSelectorProps & AppBarProps) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const selectedUserIds = useAppSelector((state) => state.analysis.selectedUserIds);

  // handlers (for ui)
  const handleUserIdChange = (userIds: number[]) => {
    dispatch(AnalysisActions.setSelectedUserIds(userIds));
  };

  // init
  useEffect(() => {
    if (user && selectedUserIds === undefined) {
      dispatch(AnalysisActions.setSelectedUserIds([user.id]));
    }
  }, [selectedUserIds, dispatch, user]);

  // render
  return (
    <AppBar
      position="relative"
      variant="outlined"
      elevation={0}
      sx={{
        backgroundColor: (theme) => theme.palette.background.paper,
        color: (theme) => theme.palette.text.primary,
        borderRadius: 1,
        ...props.sx,
      }}
      {...props}
    >
      <Toolbar variant="dense">
        <UserSelectorMulti
          projectId={projectId}
          userIds={selectedUserIds || []}
          onUserIdChange={handleUserIdChange}
          title="Annotations"
        />
      </Toolbar>
    </AppBar>
  );
}

export default CodeFrequencyUserSelector;
