import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import * as React from "react";
import { useEffect, useMemo } from "react";
import SdocHooks from "../../api/SdocHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";
import UserName from "../../components/UserName.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { SYSTEM_USER_ID } from "../../utils/GlobalConstants.ts";
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
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);

  // global server state (react query)
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);
  const adocId2UserId: Record<number, number> = useMemo(() => {
    return (
      annotationDocuments.data?.reduce(
        (acc, adoc) => {
          acc[adoc.id] = adoc.user_id;
          return acc;
        },
        {} as Record<number, number>,
      ) || {}
    );
  }, [annotationDocuments.data]);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    dispatch(AnnoActions.setVisibleAdocIds(event.target.value as number[]));
  };

  // init
  useEffect(() => {
    if (user && annotationDocuments.data) {
      // find the annotationDocument that belongs to the current user
      const userAdoc = annotationDocuments.data.find((adoc) => adoc.user_id === user.id);
      if (!userAdoc) {
        dispatch(AnnoActions.setVisibleAdocIds([SYSTEM_USER_ID]));
      } else {
        dispatch(AnnoActions.setVisibleAdocIds([userAdoc.id]));
      }
    }
  }, [dispatch, user, annotationDocuments.data]);

  // render
  return (
    <FormControl size="small">
      <InputLabel id="annotation-user-select-label">Annotations</InputLabel>
      <Select
        labelId="annotation-user-select-label"
        multiple
        fullWidth
        sx={{ minWidth: 150 }}
        value={visibleAdocIds || []}
        onChange={handleChange}
        disabled={!annotationDocuments.isSuccess}
        renderValue={(selected) =>
          selected.map((adocId, index) => (
            <React.Fragment key={adocId}>
              <UserName userId={adocId2UserId[adocId]} />
              {index < selected.length - 1 && ", "}
            </React.Fragment>
          ))
        }
      >
        {annotationDocuments.isSuccess &&
          annotationDocuments.data.map((adoc) => (
            <MenuItem key={adoc.id} value={adoc.id}>
              <Checkbox checked={visibleAdocIds?.indexOf(adoc.id) !== -1} />
              <ListItemText>
                <UserName userId={adoc.user_id} />
              </ListItemText>
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}
