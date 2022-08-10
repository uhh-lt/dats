import SdocHooks from "../../api/SdocHooks";
import { FormControl, MenuItem, Select, SelectChangeEvent, Toolbar } from "@mui/material";
import UserHooks from "../../api/UserHooks";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { AnnoActions } from "./annoSlice";

interface AnnotationDocumentSelectorProps {
  sdocId: number | undefined;
}

/**
 * This component lets the user select annotation documents (that are associated with the SourceDocument) to show in the Annotator.
 * The selected annotation documents are stored in the redux store.
 * @param sdocId the id of the SourceDocument to select annotation documents for
 */
export function AnnotationDocumentSelector({ sdocId }: AnnotationDocumentSelectorProps) {
  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const dispatch = useAppDispatch();

  // global server state (react query)
  const annotationDocuments = SdocHooks.useGetAllAnnotationDocuments(sdocId);

  // handlers (for ui)
  const handleChange = (event: SelectChangeEvent<number[]>) => {
    dispatch(AnnoActions.setVisibleAdocIds(event.target.value as number[]));
  };

  // render
  return (
    <Toolbar variant="dense">
      <FormControl size="small" fullWidth>
        <Select multiple value={visibleAdocIds} onChange={handleChange} disabled={!annotationDocuments.isSuccess}>
          {annotationDocuments.isSuccess &&
            annotationDocuments.data.map((adoc) => (
              <MenuItem key={adoc.id} value={adoc.id}>
                <UserNameText userId={adoc.user_id} />
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </Toolbar>
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
