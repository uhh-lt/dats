import { StackProps } from "@mui/material";
import { useEffect } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import UserSelector from "../UserSelector";
import { AnnotatedSegmentsActions } from "./annotatedSegmentsSlice";

interface AnnotatedSegmentsUserSelectorProps {
  projectId: number | undefined;
}

function AnnotatedSegmentsUserSelector({
  projectId,
  ...props
}: AnnotatedSegmentsUserSelectorProps & Omit<StackProps, "direction" | "alignItems">) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const selectedUserIds = useAppSelector((state) => state.annotatedSegments.selectedUserIds);

  // handlers (for ui)
  const handleUserIdChange = (userIds: number[]) => {
    dispatch(AnnotatedSegmentsActions.setSelectedUserIds(userIds));
  };

  // init
  useEffect(() => {
    if (user && selectedUserIds.length === 0) {
      dispatch(AnnotatedSegmentsActions.setSelectedUserIds([user.id]));
    }
  }, [selectedUserIds, dispatch, user]);

  // render
  return (
    <UserSelector
      projectId={projectId}
      userIds={selectedUserIds || []}
      onUserIdChange={handleUserIdChange}
      title="Annotations"
      {...props}
    />
  );
}

export default AnnotatedSegmentsUserSelector;
