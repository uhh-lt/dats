import { ExpandableRendererProps } from "@components/ExpandableRenderer";
import { CodeRenderer } from "@core/code";
import { MemoIndicator } from "@core/memo";
import { LinkWrapper } from "@core/navigation";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { SdocRenderer, SdocRendererSharedProps, SdocTagsRenderer } from "@core/source-document";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { Box, Stack, Typography } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { ReactNode } from "react";

export interface AnnotationRendererSharedProps extends ExpandableRendererProps {
  renderCode?: boolean;
  renderText?: boolean;
  renderSdoc?: boolean;
  renderSdocTags?: boolean;
  renderSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
  link?: boolean;
  renderMemoIndicator?: boolean;
}

interface AnnotationSummaryRowProps extends AnnotationRendererSharedProps {
  sdocId: number;
  codeId: number;
  /**
   * The annotation-specific text snippet (span text, sentence range, bbox coordinates, ...).
   */
  text: ReactNode;
  userId: number;
  annotationId: number;
  annotationType: AttachedObjectType;
  memoIds?: number[];
}

export function AnnotationSummaryRow({
  sdocId,
  codeId,
  text,
  userId,
  annotationId,
  annotationType,
  memoIds,
  renderCode,
  renderText,
  renderSdoc,
  renderSdocTags,
  renderSdocProjectMetadataId,
  sdocRendererProps,
  link,
  renderMemoIndicator,
}: AnnotationSummaryRowProps) {
  // annotations are rendered inside a project page, so the link takes the project from the route
  const { projectId } = useParams({ strict: false });

  const summary = (
    <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
      {renderSdoc && <SdocRenderer sdoc={sdocId} {...sdocRendererProps} />}
      {renderSdocTags && <SdocTagsRenderer sdocId={sdocId} />}
      {renderSdocProjectMetadataId && (
        <SdocMetadataRenderer sdocId={sdocId} projectMetadataId={renderSdocProjectMetadataId} />
      )}
      {/* the code is the most important part: it keeps its width, only the text is truncated */}
      {renderCode && (
        <Box flexShrink={0} maxWidth="100%" minWidth={0}>
          <CodeRenderer code={codeId} />
        </Box>
      )}
      {renderCode && renderText ? (
        <Typography component="span" flexShrink={0} mr={0.5}>
          :
        </Typography>
      ) : null}
      {renderText ? (
        <Typography component="span" noWrap minWidth={0}>
          {text}
        </Typography>
      ) : null}
      {renderMemoIndicator && memoIds && memoIds.length > 0 && (
        <MemoIndicator memoIds={memoIds} attachedObjectType={annotationType} attachedObjectId={annotationId} />
      )}
    </Stack>
  );
  if (!link || projectId === undefined) {
    return summary;
  }
  return (
    <LinkWrapper
      to="/project/$projectId/annotation/$sdocId"
      params={{ projectId, sdocId }}
      search={{
        visibleUserId: userId,
        selectedAnnotationId: annotationId,
      }}
      link
      sx={{ display: "block", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
    >
      {summary}
    </LinkWrapper>
  );
}
