import LabelIcon from "@mui/icons-material/Label";
import { Box, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolvedCode } from "../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";

interface AttachedObjectLinkProps {
  attachedObjectType: AttachedObjectType;
  attachedObject:
    | SourceDocumentRead
    | DocumentTagRead
    | CodeRead
    | SpanAnnotationReadResolved
    | BBoxAnnotationReadResolvedCode;
}

export default function AttachedObjectLink({ attachedObjectType, attachedObject }: AttachedObjectLinkProps) {
  return (
    <>
      {attachedObjectType === AttachedObjectType.CODE ? (
        <CodeLink code={attachedObject as CodeRead} />
      ) : attachedObjectType === AttachedObjectType.SOURCE_DOCUMENT ? (
        <SdocLink sdoc={attachedObject as SourceDocumentRead} />
      ) : attachedObjectType === AttachedObjectType.DOCUMENT_TAG ? (
        <TagLink tag={attachedObject as DocumentTagRead} />
      ) : attachedObjectType === AttachedObjectType.SPAN_ANNOTATION ? (
        <SpanAnnotationLink spanAnnotation={attachedObject as SpanAnnotationReadResolved} />
      ) : attachedObjectType === AttachedObjectType.BBOX_ANNOTATION ? (
        <BBoxAnnotationLink bboxAnnotation={attachedObject as BBoxAnnotationReadResolvedCode} />
      ) : (
        <>Not supported!</>
      )}
    </>
  );
}

function CodeLink({ code }: { code: CodeRead }) {
  return (
    <Stack direction="row" alignItems="center" component="span">
      attached to code{" "}
      <Box
        sx={{ width: 22, height: 22, backgroundColor: code.color, ml: 1.5, mr: 1, flexShrink: 0 }}
        component="span"
      />
      {code.name}
    </Stack>
  );
}

function SdocLink({ sdoc }: { sdoc: SourceDocumentRead }) {
  return (
    <>
      attached to{" "}
      <Link component={RouterLink} to={`../search/doc/${sdoc.id}`} color="inherit">
        {sdoc.filename}
      </Link>
    </>
  );
}

function TagLink({ tag }: { tag: DocumentTagRead }) {
  return (
    <Stack direction="row" alignItems="center" component="span">
      attached to tag <LabelIcon sx={{ ml: 1.5, mr: 1, color: tag.color }} />
      {tag.name}
    </Stack>
  );
}

function SpanAnnotationLink({ spanAnnotation }: { spanAnnotation: SpanAnnotationReadResolved }) {
  // query
  const sdoc = SdocHooks.useGetDocumentByAdocId(spanAnnotation.annotation_document_id);

  if (sdoc.isSuccess) {
    return (
      <>
        <Typography
          variant="subtitle1"
          fontSize={12}
          fontWeight={600}
          borderLeft={4}
          borderColor={spanAnnotation.code.color}
          paddingLeft={1}
        >
          attached to{" "}
          <Link component={RouterLink} to={`../annotation/${sdoc.data.id}`} color="inherit">
            <span
              style={{
                backgroundColor: spanAnnotation.code.color,
              }}
            >
              [{spanAnnotation.code.name}] {spanAnnotation.span_text}
            </span>
          </Link>{" "}
          of{" "}
          <Link component={RouterLink} to={`../search/doc/${sdoc.data.id}`} color="inherit">
            {sdoc.data.filename}
          </Link>
        </Typography>
      </>
    );
  }

  if (sdoc.isError) {
    return <>{sdoc.error}</>;
  }

  return (
    <>
      {spanAnnotation.span_text} ({spanAnnotation.code.name})
    </>
  );
}

function BBoxAnnotationLink({ bboxAnnotation }: { bboxAnnotation: BBoxAnnotationReadResolvedCode }) {
  // query
  const sdoc = SdocHooks.useGetDocumentByAdocId(bboxAnnotation.annotation_document_id);

  if (sdoc.isSuccess) {
    return (
      <>
        attached to{" "}
        <Link component={RouterLink} to={`../annotation/${sdoc.data.id}`} color="inherit">
          Bounding Box ({bboxAnnotation.code.name})
        </Link>
        of{" "}
        <Link component={RouterLink} to={`../search/doc/${sdoc.data.id}`} color="inherit">
          {sdoc.data.filename}
        </Link>
      </>
    );
  }

  if (sdoc.isError) {
    return <>{sdoc.error}</>;
  }

  return <>({bboxAnnotation.code.name})</>;
}
