import {
  AppBar,
  Checkbox,
  FormControl,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import * as React from "react";
import { useEffect } from "react";
import { useAuth } from "../../auth/AuthProvider";
import Typography from "@mui/material/Typography";
import UserName from "../../components/UserName";
import SdocHooks from "../../api/SdocHooks";


/**
The filter task bar on the top left of the Autologbook viewer.
 */
export function ActionFilters() {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const visibleUserIds = useAppSelector((state) => state.annotations.visibleUserIds);

  // global server state (react query)
  const sdocId = 0
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    //dispatch(AnnoActions.setVisibleUserIds(event.target.value as number[]));
  };

  // init
  useEffect(() => {
    if (user.data && visibleUserIds === undefined) {
      //dispatch(AnnoActions.setVisibleUserIds([user.data.id]));
    }
  }, [visibleUserIds, dispatch, user.data]);

  // effects
  // ensure that visible adocs, visible user ids and source document id are in sync
  useEffect(() => {
    if (!annotationDocuments.data) {
      //dispatch(AnnoActions.setVisibleAdocIds([]));
      return;
    }

    const adocIds = annotationDocuments.data
      .filter((adoc) => visibleUserIds?.includes(adoc.user_id) && adoc.source_document_id === sdocId)
      .map((adoc) => adoc.id);

    //dispatch(AnnoActions.setVisibleAdocIds(adocIds));
  }, [dispatch, annotationDocuments.data, sdocId, visibleUserIds]);

  // render
  return (
    <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
      <Toolbar variant="dense">
        <FormControl size="small" fullWidth>
          <Stack direction="row" sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="h6" color="inherit" component="div" className="overflow-ellipsis" flexShrink={0}>
              Visible annotations:
            </Typography>
            <Select
              sx={{ ml: 1, backgroundColor: "white" }}
              multiple
              fullWidth
              value={visibleUserIds || []}
              onChange={handleChange}
              disabled={!annotationDocuments.isSuccess}
              renderValue={(selected) =>
                selected.map((x, index) => (
                  <React.Fragment key={x}>
                    <UserName userId={x} />
                    {index < selected.length - 1 && ", "}
                  </React.Fragment>
                ))
              }
            >
              {annotationDocuments.isSuccess &&
                annotationDocuments.data.map((adoc) => (
                  <MenuItem key={adoc.user_id} value={adoc.user_id}>
                    <Checkbox checked={visibleUserIds?.indexOf(adoc.user_id) !== -1} />
                    <ListItemText>
                      <UserName userId={adoc.user_id} />
                    </ListItemText>
                  </MenuItem>
                ))}
            </Select>
          </Stack>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
}
