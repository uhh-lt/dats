import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Stack,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import { SearchResultItem } from "./SearchResultItem";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SdocHooks from "../../../api/SdocHooks";
import * as React from "react";
import { useMemo } from "react";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import SearchResultTag from "./SearchResultTag";
import { DocType } from "../../../api/openapi";
import Checkbox from "@mui/material/Checkbox";
import AnnotateButton from "../ToolBar/ToolBarElements/AnnotateButton";

const StyledCardHeader = styled(CardHeader)(() => ({
  color: "inherit",
  "& .MuiCardHeader-content": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

function SearchResultCard({ sdocId, handleClick, handleOnContextMenu, handleOnCheckboxChange }: SearchResultItem) {
  // router
  const { projectId, sdocId: urlSdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const isShowTags = useAppSelector((state) => state.search.isShowTags);

  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const tags = SdocHooks.useGetAllDocumentTags(sdocId);

  const isSelected = useMemo(() => {
    return selectedDocumentIds.indexOf(sdocId) !== -1;
  }, [sdocId, selectedDocumentIds]);

  const title = sdoc.isLoading ? "Loading" : sdoc.isError ? "Error: " : sdoc.isSuccess ? sdoc.data.filename : "";

  const labelId = `enhanced-table-checkbox-${sdocId}`;

  return (
    <Card
      sx={{ width: 300, height: 370 }}
      onContextMenu={handleOnContextMenu(sdocId)}
      raised={isSelected || (parseInt(urlSdocId || "") === sdocId && selectedDocumentIds.length === 0)}
    >
      <CardActionArea onClick={() => sdoc.isSuccess && handleClick(sdoc.data)}>
        <Tooltip title={title} placement="top-start" enterDelay={500} followCursor>
          <StyledCardHeader
            title={title}
            action={
              <Checkbox
                color="primary"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={(event) => handleOnCheckboxChange(event, sdocId)}
                inputProps={{
                  "aria-labelledby": labelId,
                }}
                sx={{ flexShrink: 0 }}
                disabled={!sdoc.isSuccess}
              />
            }
          />
        </Tooltip>
        <CardContent sx={{ pt: 0 }}>
          {sdoc.isLoading && (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              ...
            </Typography>
          )}
          {sdoc.isError && (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              {sdoc.error.message}
            </Typography>
          )}
          {sdoc.isSuccess && sdoc.data.doctype === DocType.TEXT && (
            <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
              {sdoc.data.content}
            </Typography>
          )}
          {sdoc.isSuccess && sdoc.data.doctype === DocType.IMAGE && (
            <CardMedia sx={{ mb: 1.5 }} component="img" height="200" image={sdoc.data.content} alt="Paella dish" />
          )}

          <Stack direction={"row"} sx={{ alignItems: "center", height: 22 }}>
            {tags.isLoading && <>...</>}
            {tags.isError && <>{tags.error.message}</>}
            {tags.isSuccess && isShowTags && tags.data.map((tag) => <SearchResultTag key={tag.id} tagId={tag.id} />)}
          </Stack>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <AnnotateButton projectId={projectId} sdocId={sdocId} />
        <MemoButton sdocId={sdocId} edge="end" />
      </CardActions>
    </Card>
  );
}

export default SearchResultCard;
