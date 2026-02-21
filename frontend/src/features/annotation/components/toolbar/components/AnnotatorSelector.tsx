import { FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { useEffect } from "react";
import { SdocHooks } from "../../../../../api/SdocHooks.ts";
import { UserRenderer } from "../../../../../core/user/renderer/UserRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../../../plugins/ReduxHooks.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import { AnnoActions } from "../../../annoSlice.ts";

interface AnnotatorSelector {
  sdocId: number | undefined;
}

/**
 * This component lets the user select annotation documents (that are associated with the SourceDocument) to show in the Annotator.
 * The selected (visible) annotation documents are stored in the redux store.
 * @param sdocId the id of the SourceDocument to select annotation documents for
 */
export function AnnotatorSelector({ sdocId }: AnnotatorSelector) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const visibleUserId = useAppSelector((state) => state.annotations.visibleUserId);
  const isCompareMode = useAppSelector((state) => state.annotations.isCompareMode);

  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);
  const userIds = Array.from(new Set([...(user ? [user.id] : []), ...(annotatorUserIds.data || [])]));

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    dispatch(AnnoActions.setVisibleUserId(event.target.value as number));
  };

  // init
  useEffect(() => {
    if (user && annotatorUserIds.data && !isCompareMode) {
      // always add the current user to the visible users
      dispatch(AnnoActions.setVisibleUserId(user.id));
    }
  }, [dispatch, user, annotatorUserIds.data, isCompareMode]);

  // render
  if (!user?.id || userIds.length === 0 || !visibleUserId) return null;
  return (
    <FormControl size="small">
      <InputLabel id="annotation-user-select-label">Annotations</InputLabel>
      <Select
        labelId="annotation-user-select-label"
        label="Annotations"
        fullWidth
        sx={{ minWidth: 150 }}
        value={visibleUserId}
        onChange={handleChange}
        disabled={!annotatorUserIds.isSuccess}
        renderValue={(selected) => (
          <React.Fragment key={selected}>
            <UserRenderer user={selected} />
          </React.Fragment>
        )}
      >
        {userIds.map((userId) => (
          <MenuItem key={userId} value={userId}>
            <ListItemText>
              <UserRenderer user={userId} />
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
