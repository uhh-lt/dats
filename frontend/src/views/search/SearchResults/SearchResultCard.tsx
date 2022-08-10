import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  Stack,
  Typography,
} from "@mui/material";
import { SearchResultItem } from "./SearchResultItem";
import { Link, useParams } from "react-router-dom";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SdocHooks from "../../../api/SdocHooks";
import { useMemo } from "react";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import * as React from "react";
import SearchResultTag from "./SearchResultTag";
import { DocType } from "../../../api/openapi";
import Checkbox from "@mui/material/Checkbox";

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
        <CardHeader
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
              disabled={!sdoc.isSuccess}
            />
          }
        />
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
            {tags.isSuccess &&
              isShowTags &&
              tags.data.map((tag) => <SearchResultTag key={tag.id} label={tag.title} color={tag.description} />)}
          </Stack>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <Tooltip title="Annotate">
          <IconButton
            component={Link}
            to={`/project/${projectId}/annotation/${sdocId}`}
            onClick={(e: any) => e.stopPropagation()}
          >
            <BorderColorIcon />
          </IconButton>
        </Tooltip>
        <MemoButton sdocId={sdocId} edge="end" />
      </CardActions>
    </Card>
  );
}

export default SearchResultCard;
