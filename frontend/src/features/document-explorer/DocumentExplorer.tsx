import * as React from "react";
import Typography from "@mui/material/Typography";
import {
  AppBar,
  FormControl,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import ProjectHooks from "../../api/ProjectHooks";
import { Link as RouterLink, useParams } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks";
import { useQuery } from "@tanstack/react-query";
import { SearchService } from "../../api/openapi";
import { parseInt } from "lodash";
import MemoButton from "../memo-dialog/MemoButton";
import DocumentNavigation from "../../components/DocumentNavigation";
import { AnnoActions, selectSelectedDocumentTagId } from "../../views/annotation/annoSlice";

function DocumentExplorer({ ...props }) {
  // router
  const { projectId, sdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // global client state (redux)
  const selectedDocumentTag = useAppSelector(selectSelectedDocumentTagId);
  const dispatch = useAppDispatch();

  // server state (react query)
  const documentTags = ProjectHooks.useGetAllTags(parseInt(projectId));
  const sdocs = useQuery<number[], Error>(
    ["sdocsByTag", selectedDocumentTag],
    () => {
      return SearchService.searchSdocsSearchSdocPost({
        requestBody: {
          proj_id: parseInt(projectId),
          tag_ids: [selectedDocumentTag!],
          all_tags: true,
        },
      });
    },
    { enabled: !!selectedDocumentTag }
  );

  // ui event handler
  const handleDocumentTagChange = (event: SelectChangeEvent) => {
    const tagId = event.target.value;
    dispatch(AnnoActions.setSelectedDocumentTagId(tagId !== "-1" ? parseInt(event.target.value) : undefined));
  };

  return (
    <Paper square className="myFlexContainer h100" {...props}>
      <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
        <Toolbar variant="dense">
          <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" color="inherit" component="div" className="overflow-ellipsis">
              Document Explorer
            </Typography>
            {documentTags.isLoading && <div>Loading!</div>}
            {documentTags.isError && <div>Error: {documentTags.error.message}</div>}
            {documentTags.isSuccess && (
              <FormControl size="small">
                <Select
                  sx={{ backgroundColor: "white" }}
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={selectedDocumentTag?.toString() || "-1"}
                  onChange={handleDocumentTagChange}
                >
                  <MenuItem value="-1">Select a tag...</MenuItem>
                  {documentTags.data.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id.toString()}>
                      {tag.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <DocumentNavigation idsToNavigate={sdocs.data || []} searchPrefix={"../annotation/"} />
          </Stack>
        </Toolbar>
      </AppBar>
      {!selectedDocumentTag ? (
        <div>Please select a document tag above :)</div>
      ) : sdocs.isSuccess ? (
        <>
          {sdocs.data.length === 0 && <div>No documents found...</div>}
          {sdocs.data.length > 0 && (
            <List className="myFlexFillAllContainer">
              {sdocs.data.map((sId) => (
                <ListItem
                  key={sId}
                  secondaryAction={
                    <div className="myShowMoreMenu">
                      <MemoButton edge="end" sdocId={sId} />
                    </div>
                  }
                  disablePadding
                  className="myShowMoreListItem"
                >
                  <ListItemButton
                    component={RouterLink}
                    to={`../annotation/${sId}`}
                    selected={parseInt(sdocId || "") === sId}
                  >
                    <ListItemText primary={<SourceDocumentTitle sdocId={sId} />} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </>
      ) : sdocs.isError ? (
        <div>Error: {sdocs.error.message}</div>
      ) : (
        <div>Loading!</div>
      )}
    </Paper>
  );
}

function SourceDocumentTitle({ sdocId }: { sdocId: number }) {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) return <>{sdoc.data.filename}</>;
  if (sdoc.isError) return <>Error: {sdoc.error.message}</>;
  return <>"Loading..."</>;
}

export default DocumentExplorer;
