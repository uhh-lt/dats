import { ExpandableRendererProps } from "@components/ExpandableRenderer";
import { BBoxAnnotationRenderer } from "@core/bbox-annotation";
import { CodeRenderer } from "@core/code";
import { ProjectRenderer } from "@core/project";
import { SentenceAnnotationRenderer } from "@core/sentence-annotation";
import { SdocRenderer } from "@core/source-document";
import { SpanAnnotationRenderer } from "@core/span-annotation";
import { TagRenderer } from "@core/tag";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { memo } from "react";

// the object a memo is attached to, as the memo references it: its type and id (each case renders the entity by id)
interface AttachedObjectRendererProps extends ExpandableRendererProps {
  attachedObjectType: AttachedObjectType;
  attachedObjectId: number;
  link?: boolean;
}

export const AttachedObjectRenderer = memo(
  ({ attachedObjectType, attachedObjectId, link, ...expandProps }: AttachedObjectRendererProps) => {
    switch (attachedObjectType) {
      case AttachedObjectType.BBOX_ANNOTATION:
        return (
          <BBoxAnnotationRenderer
            bboxAnnotation={attachedObjectId}
            link={link}
            renderCode
            renderText
            {...expandProps}
          />
        );
      case AttachedObjectType.SPAN_ANNOTATION:
        return (
          <SpanAnnotationRenderer
            spanAnnotation={attachedObjectId}
            link={link}
            renderCode
            renderText
            {...expandProps}
          />
        );
      case AttachedObjectType.SENTENCE_ANNOTATION:
        return (
          <SentenceAnnotationRenderer
            sentenceAnnotation={attachedObjectId}
            link={link}
            renderCode
            renderText
            {...expandProps}
          />
        );
      case AttachedObjectType.TAG:
        return <TagRenderer tag={attachedObjectId} {...expandProps} />;
      case AttachedObjectType.CODE:
        return <CodeRenderer code={attachedObjectId} {...expandProps} />;
      case AttachedObjectType.SOURCE_DOCUMENT:
        return <SdocRenderer sdoc={attachedObjectId} renderName renderDoctypeIcon link={link} {...expandProps} />;
      case AttachedObjectType.PROJECT:
        return <ProjectRenderer project={attachedObjectId} {...expandProps} />;
      default:
        return <>{attachedObjectType}</>;
    }
  },
);
