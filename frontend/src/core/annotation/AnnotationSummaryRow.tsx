import { ExpandableRendererProps } from "@components/ExpandableRenderer";
import { CodeRenderer } from "@core/code";
import { LinkWrapper } from "@core/navigation";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { SdocRenderer, SdocRendererSharedProps, SdocTagsRenderer } from "@core/source-document";
import { Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

export interface AnnotationRendererSharedProps extends ExpandableRendererProps {
  showCode?: boolean;
  showText?: boolean;
  showSdoc?: boolean;
  showSdocTags?: boolean;
  showSdocProjectMetadataId?: number;
  sdocRendererProps?: SdocRendererSharedProps;
  link?: boolean;
}

interface AnnotationSummaryRowProps extends AnnotationRendererSharedProps {
  sdocId: number;
  codeId: number;
  /**
   * The annotation-specific text snippet (span text, sentence range, bbox coordinates, ...).
   */
  text: ReactNode;
  projectId: number;
  userId: number;
  annotationId: number;
}

export function AnnotationSummaryRow({
  sdocId,
  codeId,
  text,
  projectId,
  userId,
  annotationId,
  showCode,
  showText,
  showSdoc,
  showSdocTags,
  showSdocProjectMetadataId,
  sdocRendererProps,
  link,
}: AnnotationSummaryRowProps) {
  return (
    <LinkWrapper
      to="/project/$projectId/annotation/$sdocId"
      params={{ projectId, sdocId }}
      search={{
        visibleUserId: userId,
        selectedAnnotationId: annotationId,
      }}
      link={!!link}
      sx={{ display: "block", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
    >
      <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
        {showSdoc && <SdocRenderer sdoc={sdocId} {...sdocRendererProps} />}
        {showSdocTags && <SdocTagsRenderer sdocId={sdocId} />}
        {showSdocProjectMetadataId && (
          <SdocMetadataRenderer sdocId={sdocId} projectMetadataId={showSdocProjectMetadataId} />
        )}
        {showCode && <CodeRenderer code={codeId} />}
        {showCode && showText ? (
          <Typography component="span" flexShrink={0}>
            :{" "}
          </Typography>
        ) : null}
        {showText ? (
          <Typography component="span" noWrap minWidth={0}>
            {text}
          </Typography>
        ) : null}
      </Stack>
    </LinkWrapper>
  );
}
