import SdocHooks from "../../api/SdocHooks";
import { AppBar, FormControl, MenuItem, Select, SelectChangeEvent, Stack, Toolbar } from "@mui/material";
import UserHooks from "../../api/UserHooks";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { AnnoActions } from "./annoSlice";
import { useEffect } from "react";
import { useAuth } from "../../auth/AuthProvider";
import Typography from "@mui/material/Typography";
import * as React from "react";

interface AnnotationDocumentSelectorProps {
  sdocId: number | undefined;
}

/**
 * This component lets the user select annotation documents (that are associated with the SourceDocument) to show in the Annotator.
 * The selected (visible) annotation documents are stored in the redux store.
 * @param sdocId the id of the SourceDocument to select annotation documents for
 */
export function AnnotationDocumentSelector({ sdocId }: AnnotationDocumentSelectorProps) {
  // global client state (context)
  const { user } = useAuth();

  // global client state (redux)
  const dispatch = useAppDispatch();
  const visibleUserIds = useAppSelector((state) => state.annotations.visibleUserIds);

  // global server state (react query)
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    dispatch(AnnoActions.setVisibleUserIds(event.target.value as number[]));
  };

  // init
  useEffect(() => {
    if (user.isSuccess && visibleUserIds === undefined) {
      dispatch(AnnoActions.setVisibleUserIds([user.data.id]));
    }
  }, [visibleUserIds, dispatch, user]);

  // effects
  // ensure that visible adocs, visible user ids and source document id are in sync
  useEffect(() => {
    if (!annotationDocuments.isSuccess) {
      dispatch(AnnoActions.setVisibleAdocIds([]));
      return;
    }

    const adocIds = annotationDocuments.data
      .filter((adoc) => visibleUserIds?.includes(adoc.user_id) && adoc.source_document_id === sdocId)
      .map((adoc) => adoc.id);

    dispatch(AnnoActions.setVisibleAdocIds(adocIds));
  }, [dispatch, annotationDocuments, sdocId, visibleUserIds]);

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
            >
              {annotationDocuments.isSuccess &&
                annotationDocuments.data.map((adoc) => (
                  <MenuItem key={adoc.user_id} value={adoc.user_id}>
                    <UserNameText userId={adoc.user_id} />
                  </MenuItem>
                ))}
            </Select>
          </Stack>
        </FormControl>
      </Toolbar>
    </AppBar>
  );
}

function UserNameText({ userId }: { userId: number }) {
  const user = UserHooks.useGetUser(userId);
  return (
    <>
      {user.isLoading && <>Loading...</>}
      {user.isError && <>Error: {user.error.message}</>}
      {user.isSuccess && (
        <>
          {user.data.first_name} {user.data.last_name}
        </>
      )}
    </>
  );
}
