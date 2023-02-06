import { Chip, ChipProps, Tooltip } from "@mui/material";
import * as React from "react";
import { FilterType, SearchFilter } from "./SearchFilter";
import CodeHooks from "../../api/CodeHooks";
import { SpanEntity } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import CancelIcon from "@mui/icons-material/Cancel";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { SearchActions } from "./searchSlice";

interface SearchFilterChipProps {
  filter: SearchFilter;
  filterIdx: number;
  handleDelete: (filter: SearchFilter) => void;
}

const props: ChipProps = {
  deleteIcon: (
    <Tooltip title="Remove filter">
      <CancelIcon />
    </Tooltip>
  ),
};

function SearchFilterChip({ filter, filterIdx, handleDelete }: SearchFilterChipProps) {
  const position = useAppSelector((state) => state.search.filterAnchorPositions)[filterIdx];

  switch (filter.type) {
    case FilterType.CODE:
      return (
        <CodeFilterChip
          anchorId={filter.id}
          filterIdx={filterIdx}
          position={position}
          spanEntity={filter.data as SpanEntity}
          onDelete={() => handleDelete(filter)}
          {...props}
        />
      );
    case FilterType.TAG:
      return (
        <DocumentTagFilterChip documentTagId={filter.data as number} onDelete={() => handleDelete(filter)} {...props} />
      );
    case FilterType.KEYWORD:
      return (
        <KeywordFilterChip
          anchorId={filter.id}
          filterIdx={filterIdx}
          position={position}
          keyword={filter.data as string}
          onDelete={() => handleDelete(filter)}
          {...props}
        />
      );
    case FilterType.TERM:
      return (
        <TextFilterChip
          anchorId={filter.id}
          filterIdx={filterIdx}
          position={position}
          text={filter.data as string}
          onDelete={() => handleDelete(filter)}
          {...props}
        />
      );
    case FilterType.SENTENCE:
      return <SentenceFilterChip text={filter.data as string} onDelete={() => handleDelete(filter)} {...props} />;
    case FilterType.IMAGE:
      return <ImageFilterChip sdocId={filter.data as number} onDelete={() => handleDelete(filter)} {...props} />;
    case FilterType.FILENAME:
      return <FileFilterChip text={filter.data as string} onDelete={() => handleDelete(filter)} {...props} />;
    case FilterType.METADATA:
      return (
        <MetadataFilterChip
          metadata={filter.data as { key: string; value: string }}
          onDelete={() => handleDelete(filter)}
          {...props}
        />
      );
    default:
      return <> ERROR!!</>;
  }
}

export default SearchFilterChip;

function DocumentTagFilterChip({ documentTagId, ...props }: { documentTagId: number } & ChipProps) {
  const documentTag = TagHooks.useGetTag(documentTagId);

  return (
    <>
      {documentTag.isLoading && <Chip label="Loading..." />}
      {documentTag.isError && <Chip label={documentTag.error.message} />}
      {documentTag.isSuccess && <Chip label={`Tag: ${documentTag.data.title}`} {...props} />}
    </>
  );
}

function KeywordFilterChip({
  anchorId,
  filterIdx,
  position,
  keyword,
  ...props
}: { anchorId: string; filterIdx: number; position: number; keyword: string } & ChipProps) {
  const dispatch = useAppDispatch();
  return (
    <a href={"#" + anchorId + position} onClick={() => dispatch(SearchActions.increaseFilterAnchorPosition(filterIdx))}>
      <Chip label={`Keyword: ${keyword}`} {...props} />
    </a>
  );
}

function TextFilterChip({
  anchorId,
  filterIdx,
  position,
  text,
  ...props
}: { anchorId: string; filterIdx: number; position: number; text: string } & ChipProps) {
  const dispatch = useAppDispatch();
  return (
    <a href={"#" + anchorId + position} onClick={() => dispatch(SearchActions.increaseFilterAnchorPosition(filterIdx))}>
      <Chip label={text} {...props} />
    </a>
  );
}

function SentenceFilterChip({ text, ...props }: { text: string } & ChipProps) {
  return <Chip label={`Sentence: ${text}`} {...props} />;
}

function ImageFilterChip({ sdocId, ...props }: { sdocId: number } & ChipProps) {
  return <Chip label={`Image ID: ${sdocId}`} {...props} />;
}

function FileFilterChip({ text, ...props }: { text: string } & ChipProps) {
  return <Chip label={`File: ${text}`} {...props} />;
}

function MetadataFilterChip({ metadata, ...props }: { metadata: { key: string; value: string } } & ChipProps) {
  return <Chip label={`${metadata.key}: ${metadata.value}`} {...props} />;
}

function CodeFilterChip({
  anchorId,
  filterIdx,
  position,
  spanEntity,
  ...props
}: { anchorId: string; filterIdx: number; position: number; spanEntity: SpanEntity } & ChipProps) {
  const dispatch = useAppDispatch();
  const code = CodeHooks.useGetCode(spanEntity.code_id);

  return (
    <>
      {code.isLoading && <Chip label={`Loading: ${spanEntity.span_text}`} />}
      {code.isError && <Chip label={code.error.message} />}
      {code.isSuccess && (
        <a
          href={"#" + anchorId + position}
          onClick={() => dispatch(SearchActions.increaseFilterAnchorPosition(filterIdx))}
        >
          <Chip label={`${code.data.name}: ${spanEntity.span_text}`} {...props} />
        </a>
      )}
    </>
  );
}
