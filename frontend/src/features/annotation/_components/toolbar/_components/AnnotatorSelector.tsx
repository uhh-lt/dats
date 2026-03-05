import { SdocHooks } from "@api/hooks/SdocHooks";
import { useAuth } from "@core/auth";
import { UserRenderer } from "@core/user";
import { FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { useEffect } from "react";
import { AnnotationRouteAPI } from "../../../_hooks/annotationRouteAPI";

interface AnnotatorSelector {
  sdocId: number | undefined;
}

/**
 * This component lets the user select annotation documents (that are associated with the SourceDocument) to show in the Annotator.
 * The selected (visible) annotation documents are stored in the URL search params.
 * @param sdocId the id of the SourceDocument to select annotation documents for
 */
export function AnnotatorSelector({ sdocId }: AnnotatorSelector) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (URL search params)
  const navigate = AnnotationRouteAPI.useNavigate();
  const { visibleUserId, compareWithUserId } = AnnotationRouteAPI.useSearch();
  const isCompareMode = compareWithUserId !== undefined;

  // global server state (react query)
  const annotatorUserIds = SdocHooks.useGetAnnotators(sdocId);
  const userIds = Array.from(new Set([...(user ? [user.id] : []), ...(annotatorUserIds.data || [])]));

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number>) => {
    navigate({ to: ".", search: (prev) => ({ ...prev, visibleUserId: event.target.value as number }) });
  };

  // init: set current user as the visible user if not already set
  useEffect(() => {
    if (user && annotatorUserIds.data && !isCompareMode && !visibleUserId) {
      navigate({ to: ".", search: (prev) => ({ ...prev, visibleUserId: user.id }) });
    }
  }, [navigate, user, annotatorUserIds.data, isCompareMode, visibleUserId]);

  // render
  const effectiveVisibleUserId = visibleUserId ?? user?.id;
  if (!user?.id || userIds.length === 0 || !effectiveVisibleUserId) return null;
  return (
    <FormControl size="small">
      <InputLabel id="annotation-user-select-label">Annotations</InputLabel>
      <Select
        labelId="annotation-user-select-label"
        label="Annotations"
        fullWidth
        sx={{ minWidth: 150 }}
        value={effectiveVisibleUserId}
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
