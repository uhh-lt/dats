import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  CardProps,
  Stack,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import SdocHooks from "../../../../api/SdocHooks";
import * as React from "react";
import { useMemo } from "react";
import MemoButton from "../../../../features/Memo/MemoButton";
import SearchResultTag from "../SearchResultTag";
import { AttachedObjectType, SourceDocumentRead } from "../../../../api/openapi";
import Checkbox from "@mui/material/Checkbox";
import AnnotateButton from "../../ToolBar/ToolBarElements/AnnotateButton";
import { SearchResultProps } from "../SearchResultProps";

const StyledCardHeader = styled(CardHeader)(() => ({
  color: "inherit",
  "& .MuiCardHeader-content": {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
}));

interface SearchResultCardBaseProps extends SearchResultProps {
  renderContent: (sdoc: SourceDocumentRead) => React.ReactNode;
}

function SearchResultCardBase({
  sdocId,
  renderContent,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
  ...props
}: SearchResultCardBaseProps & CardProps) {
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

  return (
    <Card
      sx={props.sx ? props.sx : { width: 300, height: 370 }}
      onContextMenu={handleOnContextMenu ? handleOnContextMenu(sdocId) : undefined}
      raised={isSelected || (parseInt(urlSdocId || "") === sdocId && selectedDocumentIds.length === 0)}
      {...props}
    >
      <CardActionArea onClick={() => sdoc.isSuccess && handleClick(sdoc.data)}>
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
                sx={{ flexShrink: 0 }}
                disabled={!sdoc.isSuccess}
              />
            ) : undefined
          }
        />
        <CardContent sx={{ pt: 0, pb: 1 }}>
          {sdoc.isSuccess ? (
            <>{renderContent(sdoc.data)}</>
          ) : sdoc.isError ? (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              {sdoc.error.message}
            </Typography>
          ) : (
            <Typography sx={{ mb: 1.5 }} variant="body2">
              Loading ...
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      <CardContent sx={{ py: 0 }}>
        <Stack direction={"row"} spacing={0.5} sx={{ overflowX: "auto" }}>
          {tags.isLoading && <>...</>}
          {tags.isError && <>{tags.error.message}</>}
          {tags.isSuccess && isShowTags && tags.data.map((tag) => <SearchResultTag key={tag.id} tagId={tag.id} />)}
        </Stack>
      </CardContent>
      <CardActions>
        <AnnotateButton projectId={projectId} sdocId={sdocId} />
        <MemoButton attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} edge="end" />
      </CardActions>
    </Card>
  );
}

export default SearchResultCardBase;
