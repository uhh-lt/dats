import { SdocHooks } from "@api/hooks/SdocHooks";
import { useAuth } from "@core/auth";
import { UserRenderer } from "@core/user";
import { Divider, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";

interface CompareWithSelector {
  sdocId: number;
}

export function CompareWithSelector({ sdocId }: CompareWithSelector) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (URL search params)
  const navigate = AnnotationRouteAPI.useNavigate();
  const { compareWithUserId } = AnnotationRouteAPI.useSearch();

  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);
  const userIds = Array.from(new Set([...(user ? [user.id] : []), ...(annotatorUserIds.data || [])]));

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value;
    if (value === -1) {
      navigate({ to: ".", search: (prev) => ({ ...prev, compareWithUserId: undefined }) });
    } else {
      navigate({ to: ".", search: (prev) => ({ ...prev, compareWithUserId: event.target.value as number }) });
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
