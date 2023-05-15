import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import Checkbox from "@mui/material/Checkbox";
import { Stack, Tooltip } from "@mui/material";
import { useParams } from "react-router-dom";
import MemoButton from "../../../../features/Memo/MemoButton";
import * as React from "react";
import { useMemo } from "react";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import SdocHooks from "../../../../api/SdocHooks";
import SearchResultTag from "../SearchResultTag";
import { SearchResultProps } from "../SearchResultProps";
import AnnotateButton from "../../ToolBar/ToolBarElements/AnnotateButton";
import { AttachedObjectType } from "../../../../api/openapi";

function SearchResultDocumentTableRow({
  sdocId,
  handleClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SearchResultProps) {
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
  const labelId = `enhanced-table-checkbox-${sdocId}`;

  return (
    <TableRow
      hover
      onClick={() => sdoc.isSuccess && handleClick(sdoc.data)}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={-1}
      selected={isSelected || parseInt(urlSdocId || "") === sdocId}
      onContextMenu={handleOnContextMenu ? handleOnContextMenu(sdocId) : undefined}
      className={"myTableRow"}
    >
      <TableCell padding="checkbox">
        <Checkbox
          color="primary"
          checked={isSelected}
          onClick={(e) => e.stopPropagation()}
          onChange={handleOnCheckboxChange ? (event) => handleOnCheckboxChange(event, sdocId) : undefined}
          inputProps={{
            "aria-labelledby": labelId,
          }}
          disabled={!sdoc.isSuccess}
        />
      </TableCell>
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

          <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {sdoc.isSuccess && content.isSuccess ? (
              <>{content.data.content}</>
            ) : sdoc.isError ? (
              <>{sdoc.error.message}</>
            ) : content.isError ? (
              <>{content.error.message}</>
            ) : (
              <>...</>
            )}
          </div>
          <Stack direction={"row"} component={"span"} className={"myQuickMenu"}>
            <AnnotateButton projectId={projectId} sdocId={sdocId} />
            <MemoButton attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} edge="end" />
          </Stack>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default SearchResultDocumentTableRow;
