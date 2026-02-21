import { Divider, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { SdocHooks } from "../../../../../api/SdocHooks.ts";
import { UserRenderer } from "../../../../../core/user/renderer/UserRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../../../plugins/ReduxHooks.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import { AnnoActions } from "../../../annoSlice.ts";

interface CompareWithSelector {
  sdocId: number;
}

export function CompareWithSelector({ sdocId }: CompareWithSelector) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const compareWithUserId = useAppSelector((state) => state.annotations.compareWithUserId);

  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);
  const userIds = Array.from(new Set([...(user ? [user.id] : []), ...(annotatorUserIds.data || [])]));

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value;
    if (value === -1) {
      dispatch(AnnoActions.stopComparison());
    } else {
      dispatch(AnnoActions.compareWithUser(event.target.value as number));
    }
  };

  // render
  return (
    <FormControl size="small">
      <InputLabel id="annotation-user-select-label">Annotations</InputLabel>
      <Select
        labelId="annotation-user-select-label"
        fullWidth
        sx={{ minWidth: 150 }}
        value={compareWithUserId || -1}
        onChange={handleChange}
        disabled={!annotatorUserIds.isSuccess}
        renderValue={(selected) => (
          <React.Fragment key={selected}>
            {selected === -1 ? "Stop comparison" : <UserRenderer user={selected} />}
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
        <Divider />
        <MenuItem value={-1}>
          <ListItemText>Stop comparison</ListItemText>
        </MenuItem>
      </Select>
    </FormControl>
  );
}
