import { AttachedObjectType } from "@api/models/AttachedObjectType";
import { BBoxAnnotationRead } from "@api/models/BBoxAnnotationRead";
import { CodeRead } from "@api/models/CodeRead";
import { ProjectRead } from "@api/models/ProjectRead";
import { SentenceAnnotationRead } from "@api/models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@api/models/SourceDocumentRead";
import { SpanAnnotationRead } from "@api/models/SpanAnnotationRead";
import { TagRead } from "@api/models/TagRead";
import { memo } from "react";
import { BBoxAnnotationRenderer } from "@core/bbox-annotation";
import { CodeRenderer } from "@core/code";
import { ProjectRenderer } from "@core/project";
import { SentenceAnnotationRenderer } from "@core/sentence-annotation";
import { SdocRenderer } from "@core/source-document";
import { SpanAnnotationRenderer } from "@core/span-annotation";
import { TagRenderer } from "@core/tag";

interface AttachedObjectRendererProps {
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
  ({ attachedObject, attachedObjectType, link }: AttachedObjectRendererProps) => {
    switch (attachedObjectType) {
      case AttachedObjectType.BBOX_ANNOTATION:
        return (
          <BBoxAnnotationRenderer
            bboxAnnotation={attachedObject as BBoxAnnotationRead | number}
            showCode
            showSpanText
          />
        );
      case AttachedObjectType.SPAN_ANNOTATION:
        return (
          <SpanAnnotationRenderer
            spanAnnotation={attachedObject as SpanAnnotationRead | number}
            link={link}
            showCode
            showSpanText
          />
        );
      case AttachedObjectType.SENTENCE_ANNOTATION:
        return (
          <SentenceAnnotationRenderer
            sentenceAnnotation={attachedObject as SentenceAnnotationRead | number}
            link={link}
            showCode
            showSpanText
          />
        );
      case AttachedObjectType.TAG:
        return <TagRenderer tag={attachedObject as TagRead | number} />;
      case AttachedObjectType.CODE:
        return <CodeRenderer code={attachedObject as CodeRead | number} />;
      case AttachedObjectType.SOURCE_DOCUMENT:
        return (
          <SdocRenderer sdoc={attachedObject as SourceDocumentRead | number} renderName renderDoctypeIcon link={link} />
        );
      case AttachedObjectType.PROJECT:
        return <ProjectRenderer project={attachedObject as ProjectRead | number} />;
      default:
        return <>{attachedObjectType}</>;
    }
  },
);
