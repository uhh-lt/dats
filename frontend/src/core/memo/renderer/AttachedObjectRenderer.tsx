import { memo } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType";
import { BBoxAnnotationRead } from "../../../api/openapi/models/BBoxAnnotationRead";
import { CodeRead } from "../../../api/openapi/models/CodeRead";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead";
import { SentenceAnnotationRead } from "../../../api/openapi/models/SentenceAnnotationRead";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead";
import { SpanAnnotationRead } from "../../../api/openapi/models/SpanAnnotationRead";
import { TagRead } from "../../../api/openapi/models/TagRead";
import { BBoxAnnotationRenderer } from "../../bbox-annotation/BBoxAnnotationRenderer";
import { CodeRenderer } from "../../code/CodeRenderer";
import { ProjectRenderer } from "../../project/ProjectRenderer";
import { SentenceAnnotationRenderer } from "../../sentence-annotation/SentenceAnnotationRenderer";
import { SdocRenderer } from "../../source-document/renderer/SdocRenderer";
import { SpanAnnotationRenderer } from "../../span-annotation/SpanAnnotationRenderer";
import { TagRenderer } from "../../tag/TagRenderer";

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
