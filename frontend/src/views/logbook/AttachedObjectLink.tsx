import LabelIcon from "@mui/icons-material/Label";
import { Box, Stack } from "@mui/material";
import { Link } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolved } from "../../api/openapi/models/BBoxAnnotationReadResolved.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { docTypeToIcon } from "../../utils/docTypeToIcon.tsx";
import { AnnoActions } from "../annotation/annoSlice.ts";

interface AttachedObjectLinkProps {
  attachedObjectType: AttachedObjectType;
  attachedObject:
    | SourceDocumentRead
    | DocumentTagRead
    | CodeRead
    | SpanAnnotationReadResolved
    | BBoxAnnotationReadResolved;
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
        <BBoxAnnotationLink bboxAnnotation={attachedObject as BBoxAnnotationReadResolved} />
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
    <Stack direction="row" alignItems="center" component="span">
      {docTypeToIcon[sdoc.doctype]}
      <Link to={`../annotation/${sdoc.id}`} color="inherit" style={{ textDecoration: "none" }}>
        {sdoc.name ?? sdoc.filename}
      </Link>
    </Stack>
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
  const sdoc = SdocHooks.useGetDocument(spanAnnotation.sdoc_id);

  const dispatch = useAppDispatch();
  const handleClick = () => {
    dispatch(AnnoActions.setSelectedAnnotationId(spanAnnotation.id));
    dispatch(AnnoActions.addVisibleUserIds([spanAnnotation.user_id]));
  };

  if (sdoc.isSuccess) {
    return (
      <>
        attached to{" "}
        <Link
          to={`../annotation/${spanAnnotation.sdoc_id}`}
          color="inherit"
          onClick={handleClick}
          style={{ textDecoration: "none" }}
        >
          <span
            style={{
              backgroundColor: spanAnnotation.code.color,
            }}
          >
            [{spanAnnotation.code.name}] {spanAnnotation.text}
          </span>{" "}
          of {sdoc.data.filename}
        </Link>
      </>
    );
  }

  if (sdoc.isError) {
    return <>{sdoc.error}</>;
  }

  return (
    <>
      {spanAnnotation.text} ({spanAnnotation.code.name})
    </>
  );
}

function BBoxAnnotationLink({ bboxAnnotation }: { bboxAnnotation: BBoxAnnotationReadResolved }) {
  // query
  const sdoc = SdocHooks.useGetDocument(bboxAnnotation.sdoc_id);

  if (sdoc.isSuccess) {
    return (
      <>
        attached to{" "}
        <Link to={`../annotation/${sdoc.data.id}`} color="inherit" style={{ textDecoration: "none" }}>
          Bounding Box ({bboxAnnotation.code.name})
        </Link>
        of{" "}
        <Link to={`../annotation/${sdoc.data.id}`} color="inherit" style={{ textDecoration: "none" }}>
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
