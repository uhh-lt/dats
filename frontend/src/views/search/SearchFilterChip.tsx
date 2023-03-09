import { Chip, ChipProps, Tooltip } from "@mui/material";
import * as React from "react";
import { FilterType, SearchFilter } from "./SearchFilter";
import CodeHooks from "../../api/CodeHooks";
import { SpanEntity } from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import CancelIcon from "@mui/icons-material/Cancel";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { AnchorState, SearchActions } from "./searchSlice";

interface SearchFilterChipProps {
  filter: SearchFilter;
  handleDelete: (filter: SearchFilter) => void;
}

const props: ChipProps = {
  deleteIcon: (
    <Tooltip title="Remove filter">
      <CancelIcon />
    </Tooltip>
  ),
};

function SearchFilterChip({ filter, handleDelete }: SearchFilterChipProps) {
  const filterAnchorInfo = useAppSelector((state) => state.search.filterAnchorInfo);
  const anchorState: AnchorState | undefined =
    filterAnchorInfo[filter.id].limit === -1 ? undefined : filterAnchorInfo[filter.id];

  switch (filter.type) {
    case FilterType.CODE:
      return (
        <CodeFilterChip
          anchorId={filter.id}
          anchorState={anchorState}
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
          anchorState={anchorState}
          keyword={filter.data as string}
          onDelete={() => handleDelete(filter)}
          {...props}
        />
      );
    case FilterType.TERM:
      return (
        <TextFilterChip
          anchorId={filter.id}
          anchorState={anchorState}
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
  anchorState,
  keyword,
  ...props
}: { anchorId: string; anchorState: AnchorState | undefined; keyword: string } & ChipProps) {
  if (anchorState) {
    return <AnchorChip anchorId={anchorId} anchorState={anchorState} text={`Keyword: ${keyword}`} {...props} />;
  }
  return <Chip label={`Keyword: ${keyword}`} {...props} />;
}

function TextFilterChip({
  anchorId,
  anchorState,
  text,
  ...props
}: { anchorId: string; anchorState: AnchorState | undefined; text: string } & ChipProps) {
  if (anchorState) {
    return <AnchorChip anchorId={anchorId} anchorState={anchorState} text={text} {...props} />;
  }
  return <Chip label={text} {...props} />;
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
  anchorState,
  spanEntity,
  ...props
}: { anchorId: string; anchorState: AnchorState | undefined; spanEntity: SpanEntity } & ChipProps) {
  const code = CodeHooks.useGetCode(spanEntity.code_id);
  return (
    <>
      {code.isLoading && <Chip label={`Loading: ${spanEntity.span_text}`} />}
      {code.isError && <Chip label={code.error.message} />}
      {code.isSuccess && (
        <>
          {anchorState ? (
            <AnchorChip
              anchorId={anchorId}
              anchorState={anchorState}
              text={`${code.data.name}: ${spanEntity.span_text}`}
              {...props}
            />
          ) : (
            <Chip label={`${code.data.name}: ${spanEntity.span_text}`} style={{ cursor: "pointer" }} {...props} />
          )}
        </>
      )}
    </>
  );
}

function AnchorChip({
  anchorId,
  anchorState,
  text,
  ...props
}: { anchorId: string; anchorState: AnchorState; text: string } & ChipProps) {
  const dispatch = useAppDispatch();
  const tooltip =
    anchorState.pos + 1 > anchorState.limit
      ? `Jump to Highlight 1 / ${anchorState.limit}`
      : `Jump to Highlight ${anchorState.pos + 1} / ${anchorState.limit}`;

  return (
    <a
      href={`#${anchorId.trim()}-idx${anchorState.pos}`}
      onClick={() => dispatch(SearchActions.increaseFilterAnchorPosition(anchorId))}
    >
      <Chip
        label={
          <Tooltip title={tooltip}>
            <span>{text}</span>
          </Tooltip>
        }
        style={{ cursor: "pointer" }}
        {...props}
      />
    </a>
  );
}
