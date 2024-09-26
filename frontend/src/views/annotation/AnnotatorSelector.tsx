import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { useEffect } from "react";
import SdocHooks from "../../api/SdocHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import UserName from "../../components/User/UserName.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { AnnoActions } from "./annoSlice.ts";

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
  const visibleUserIds = useAppSelector((state) => state.annotations.visibleUserIds);

  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);
  const userIds = Array.from(new Set([...(user ? [user.id] : []), ...(annotatorUserIds.data || [])]));

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    dispatch(AnnoActions.setVisibleUserIds(event.target.value as number[]));
  };

  // init
  useEffect(() => {
    if (user && annotatorUserIds.data) {
      // always add the current user to the visible users
      dispatch(AnnoActions.setVisibleUserIds([user.id]));
    }
  }, [dispatch, user, annotatorUserIds.data]);

  // render
  return (
    <FormControl size="small">
      <InputLabel id="annotation-user-select-label">Annotations</InputLabel>
      <Select
        labelId="annotation-user-select-label"
        multiple
        fullWidth
        sx={{ minWidth: 150 }}
        value={visibleUserIds || []}
        onChange={handleChange}
        disabled={!annotatorUserIds.isSuccess}
        renderValue={(selected) =>
          selected.map((userId, index) => (
            <React.Fragment key={userId}>
              <UserName userId={userId} />
              {index < selected.length - 1 && ", "}
            </React.Fragment>
          ))
        }
      >
        {userIds.map((userId) => (
          <MenuItem key={userId} value={userId}>
            <Checkbox checked={visibleUserIds?.indexOf(userId) !== -1} />
            <ListItemText>
              <UserName userId={userId} />
            </ListItemText>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
