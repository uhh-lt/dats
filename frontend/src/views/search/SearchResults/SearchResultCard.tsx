import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  CardMedia,
  CardProps,
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
import { AttachedObjectType, DocType } from "../../../api/openapi";
import Checkbox from "@mui/material/Checkbox";
import AnnotateButton from "../ToolBar/ToolBarElements/AnnotateButton";
import { toThumbnailUrl } from "../utils";

const StyledCardHeader = styled(CardHeader)(() => ({
  color: "inherit",
  "& .MuiCardHeader-content": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

function SearchResultCard({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultItem & CardProps) {
  // router
  const { projectId, sdocId: urlSdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // redux (global client state)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const isShowTags = useAppSelector((state) => state.search.isShowTags);

  // query (global server state)
  const sdoc = SdocHooks.useGetDocument(sdocId);
  const content = SdocHooks.useGetDocumentContent(sdocId);
  const tags = SdocHooks.useGetAllDocumentTags(sdocId);

  const isSelected = useMemo(() => {
    return selectedDocumentIds.indexOf(sdocId) !== -1;
  }, [sdocId, selectedDocumentIds]);

  const title = sdoc.isLoading ? "Loading" : sdoc.isError ? "Error: " : sdoc.isSuccess ? sdoc.data.filename : "";

  const labelId = `enhanced-table-checkbox-${sdocId}`;

  return (
    <Card
      sx={{ width: 300, height: 370 }}
      onContextMenu={handleOnContextMenu ? handleOnContextMenu(sdocId) : undefined}
      raised={isSelected || (parseInt(urlSdocId || "") === sdocId && selectedDocumentIds.length === 0)}
      {...props}
    >
      <CardActionArea onClick={() => sdoc.isSuccess && handleClick(sdoc.data.id)}>
        <StyledCardHeader
          title={
            <Tooltip title={title} placement="top-start" enterDelay={500} followCursor>
              <Typography variant="h5">{title}</Typography>
            </Tooltip>
          }
          disableTypography
          action={
            handleOnCheckboxChange ? (
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
            ) : undefined
          }
        />
        <CardContent sx={{ pt: 0 }}>
          {sdoc.isSuccess && content.isSuccess ? (
            <>
              {sdoc.data.doctype === DocType.TEXT ? (
                <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                  {content.data.content}
                </Typography>
              ) : sdoc.data.doctype === DocType.IMAGE ? (
                <CardMedia
                  sx={{ mb: 1.5 }}
                  component="img"
                  height="200"
                  image={toThumbnailUrl(sdoc.data.content)}
                  alt="Paella dish"
                />
              ) : (
                <Typography sx={{ mb: 1.5, overflow: "hidden", height: 200, textOverflow: "ellipsis" }} variant="body2">
                  DOC TYPE IS NOT SUPPORTED :(
                </Typography>
              )}
            </>
          ) : sdoc.isError ? (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              {sdoc.error.message}
            </Typography>
          ) : content.isError ? (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              {content.error.message}
            </Typography>
          ) : (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              ...
            </Typography>
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
        <MemoButton attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} edge="end" />
      </CardActions>
    </Card>
  );
}

export default SearchResultCard;
