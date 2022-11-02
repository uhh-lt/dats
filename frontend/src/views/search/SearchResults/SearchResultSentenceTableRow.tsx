import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Checkbox from "@mui/material/Checkbox";
import { Stack, Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";
import MemoButton from "../../../features/memo-dialog/MemoButton";
import * as React from "react";
import { useMemo } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import SdocHooks from "../../../api/SdocHooks";
import SearchResultTag from "./SearchResultTag";
import { SearchResultItem } from "./SearchResultItem";
import AnnotateButton from "../ToolBar/ToolBarElements/AnnotateButton";
import { AttachedObjectType, SimSearchSentenceHit } from "../../../api/openapi";

interface SearchResultSentenceRowProps extends SearchResultItem {
  hit: SimSearchSentenceHit;
}

function SearchResultSentenceTableRow({
  hit,
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SearchResultSentenceRowProps) {
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
  const labelId = `enhanced-table-checkbox-${sdocId}`;

  return (
    <TableRow
      hover
      onClick={() => handleClick(sdocId)}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={-1}
      selected={isSelected || parseInt(urlSdocId || "") === sdocId}
      onContextMenu={handleOnContextMenu(sdocId)}
      className={"myTableRow"}
    >
      <TableCell padding="checkbox">
        <Checkbox
          color="primary"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={(event) => handleOnCheckboxChange(event, sdocId)}
          inputProps={{
            "aria-labelledby": labelId,
          }}
        />
      </TableCell>
      <TableCell>{(hit.score * 100).toFixed(0)}</TableCell>
      <Tooltip title={sdoc.data?.filename || "Please wait..."} placement="top-start" enterDelay={500} followCursor>
        <TableCell
          component="th"
          id={labelId}
          scope="row"
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sdoc.isLoading && <>Loading</>}
          {sdoc.isError && <>Error: </>}
          {sdoc.isSuccess && <>{sdoc.data.filename}</>}
        </TableCell>
      </Tooltip>
      <TableCell className={"myTableCell"}>
        <Stack direction={"row"} sx={{ alignItems: "center" }}>
          {tags.isLoading && <>...</>}
          {tags.isError && <>{tags.error.message}</>}
          {tags.isSuccess && isShowTags && tags.data.map((tag) => <SearchResultTag key={tag.id} tagId={tag.id} />)}

          <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{hit.sentence_text}</div>
          <Stack direction={"row"} component={"span"} className={"myQuickMenu"}>
            <AnnotateButton projectId={projectId} sdocId={sdocId} />
            <MemoButton attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} edge="end" />
          </Stack>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default SearchResultSentenceTableRow;
