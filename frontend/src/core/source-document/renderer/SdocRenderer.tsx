import { SdocHooks } from "@api/hooks/SdocHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { DocTypeIcons, getIconComponent } from "@components/icons";
import { MemoIndicator } from "@core/memo";
import { LinkWrapper } from "@core/navigation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { memo } from "react";

export interface SdocRendererSharedProps extends ExpandableRendererProps {
  link?: boolean;
  renderName?: boolean;
  renderDoctypeIcon?: boolean;
  renderMemoIndicator?: boolean;
}

interface SdocRendererProps extends SdocRendererSharedProps {
  sdoc: number | SourceDocumentRead;
}

export const SdocRenderer = memo(({ sdoc, ...props }: SdocRendererProps) => {
  if (typeof sdoc === "number") {
    return <SdocRendererWithoutData sdocId={sdoc} {...props} />;
  } else {
    return <SdocRendererWithData sdoc={sdoc} {...props} />;
  }
});

const SdocRendererWithoutData = memo(({ sdocId, ...props }: { sdocId: number } & SdocRendererSharedProps) => {
  const sdoc = SdocHooks.useGetDocument(sdocId);

  if (sdoc.isSuccess) {
    return <SdocRendererWithData sdoc={sdoc.data} {...props} />;
  } else if (sdoc.isError) {
    return <div>{sdoc.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

const SdocRendererWithData = memo(
  ({
    sdoc,
    link,
    renderName,
    renderDoctypeIcon,
    renderMemoIndicator,
    ...expandProps
  }: { sdoc: SourceDocumentRead } & SdocRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<SdocContext sdocId={sdoc.id} />}>
        <LinkWrapper
          to="/project/$projectId/annotation/$sdocId"
          params={{ projectId: sdoc.project_id, sdocId: sdoc.id }}
          link={!!link}
          sx={{ display: "block", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}
        >
          <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
            {renderDoctypeIcon && getIconComponent(DocTypeIcons[sdoc.doctype], { style: { flexShrink: 0 } })}
            {renderName ? (
              <Typography component="span" noWrap minWidth={0}>
                {sdoc.name}
              </Typography>
            ) : null}
            {renderMemoIndicator && sdoc.memo_ids && sdoc.memo_ids.length > 0 && (
              <MemoIndicator
                memoIds={sdoc.memo_ids}
                attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
                attachedObjectId={sdoc.id}
              />
            )}
          </Stack>
        </LinkWrapper>
      </ExpandableRenderer>
    );
  },
);

function SdocContext({ sdocId }: { sdocId: number }) {
  const sdocData = SdocHooks.useGetDocumentData(sdocId);

  if (sdocData.isLoading) {
    return <CircularProgress size={20} />;
  }
  if (sdocData.isError) {
    return <Typography color="error">{sdocData.error.message}</Typography>;
  }
  if (!sdocData.data || sdocData.data.sentences.length === 0) {
    return <Typography color="text.secondary">No textual context available.</Typography>;
  }

  return (
    <Stack component="ol" spacing={1} sx={{ my: 0, pl: 3 }}>
      {sdocData.data.sentences.map((sentence, index) => (
        <Typography component="li" key={index} sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {sentence}
        </Typography>
      ))}
    </Stack>
  );
}
