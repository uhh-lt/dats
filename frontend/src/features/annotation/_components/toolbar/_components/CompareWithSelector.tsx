import { SdocHooks } from "@api/hooks/SdocHooks";
import { useAuth } from "@core/auth";
import { UserRenderer } from "@core/user";
import { useURLConnector } from "@hooks/useURLConnector";
import { Divider, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";

interface CompareWithSelector {
  sdocId: number;
}

export function CompareWithSelector({ sdocId }: CompareWithSelector) {
  // global client state (context)
  const { user } = useAuth();

  const navigate = AnnotationRouteAPI.useNavigate();
  const { visibleUserId } = AnnotationRouteAPI.useSearch();
  const [compareWithUserId, setCompareWithUserId] = useURLConnector(AnnotationRouteAPI, "compareWithUserId");

  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);
  const userIds = Array.from(new Set([...(user ? [user.id] : []), ...(annotatorUserIds.data || [])]));

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value as number;
    if (value === -1) {
      setCompareWithUserId(undefined);
    } else if (value === (visibleUserId ?? user?.id)) {
      navigate({
        search: (prev) => ({
          ...prev,
          compareWithUserId: visibleUserId ?? user?.id,
          visibleUserId: compareWithUserId,
        }),
        replace: true,
      });
    } else {
      setCompareWithUserId(value);
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
