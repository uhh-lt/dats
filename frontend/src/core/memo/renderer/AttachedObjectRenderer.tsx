import { ExpandableRendererProps } from "@components/ExpandableRenderer";
import { BBoxAnnotationRenderer } from "@core/bbox-annotation";
import { CodeRenderer } from "@core/code";
import { ProjectRenderer } from "@core/project";
import { SentenceAnnotationRenderer } from "@core/sentence-annotation";
import { SdocRenderer } from "@core/source-document";
import { SpanAnnotationRenderer } from "@core/span-annotation";
import { TagRenderer } from "@core/tag";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRead } from "@models/BBoxAnnotationRead";
import { CodeRead } from "@models/CodeRead";
import { ProjectRead } from "@models/ProjectRead";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@models/SourceDocumentRead";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { TagRead } from "@models/TagRead";
import { memo } from "react";

interface AttachedObjectRendererProps extends ExpandableRendererProps {
  attachedObject:
    | TagRead
    | SourceDocumentRead
    | CodeRead
    | SpanAnnotationRead
    | SentenceAnnotationRead
    | BBoxAnnotationRead
    | ProjectRead
    | number;
  attachedObjectType: AttachedObjectType;
  link?: boolean;
}

export const AttachedObjectRenderer = memo(
  ({ attachedObject, attachedObjectType, link, ...expandProps }: AttachedObjectRendererProps) => {
    switch (attachedObjectType) {
      case AttachedObjectType.BBOX_ANNOTATION:
        return (
          <BBoxAnnotationRenderer
            bboxAnnotation={attachedObject as BBoxAnnotationRead | number}
            link={link}
            showCode
            showText
            {...expandProps}
          />
        );
      case AttachedObjectType.SPAN_ANNOTATION:
        return (
          <SpanAnnotationRenderer
            spanAnnotation={attachedObject as SpanAnnotationRead | number}
            link={link}
            showCode
            showText
            {...expandProps}
          />
        );
      case AttachedObjectType.SENTENCE_ANNOTATION:
        return (
          <SentenceAnnotationRenderer
            sentenceAnnotation={attachedObject as SentenceAnnotationRead | number}
            link={link}
            showCode
            showText
            {...expandProps}
          />
        );
      case AttachedObjectType.TAG:
        return <TagRenderer tag={attachedObject as TagRead | number} {...expandProps} />;
      case AttachedObjectType.CODE:
        return <CodeRenderer code={attachedObject as CodeRead | number} {...expandProps} />;
      case AttachedObjectType.SOURCE_DOCUMENT:
        return (
          <SdocRenderer
            sdoc={attachedObject as SourceDocumentRead | number}
            renderName
            renderDoctypeIcon
            link={link}
            {...expandProps}
          />
        );
      case AttachedObjectType.PROJECT:
        return <ProjectRenderer project={attachedObject as ProjectRead | number} {...expandProps} />;
      default:
        return <>{attachedObjectType}</>;
    }
  },
);
