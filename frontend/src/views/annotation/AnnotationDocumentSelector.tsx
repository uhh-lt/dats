import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { useEffect } from "react";
import SdocHooks from "../../api/SdocHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import UserName from "../../components/UserName.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { AnnoActions } from "./annoSlice.ts";

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
    if (user && visibleUserIds === undefined) {
      dispatch(AnnoActions.setVisibleUserIds([user.id]));
    }
  }, [visibleUserIds, dispatch, user]);

  // effects
  // ensure that visible adocs, visible user ids and source document id are in sync
  useEffect(() => {
    if (!annotationDocuments.data) {
      dispatch(AnnoActions.setVisibleAdocIds([]));
      return;
    }

    const adocIds = annotationDocuments.data
      .filter((adoc) => visibleUserIds?.includes(adoc.user_id) && adoc.source_document_id === sdocId)
      .map((adoc) => adoc.id);

    dispatch(AnnoActions.setVisibleAdocIds(adocIds));
  }, [dispatch, annotationDocuments.data, sdocId, visibleUserIds]);

  // render
  return (
    <FormControl size="small">
      <InputLabel id="annotation-user-select-label">Annotations</InputLabel>
      <Select
        labelId="annotation-user-select-label"
        label={"Annotations"}
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
    </FormControl>
  );
}
