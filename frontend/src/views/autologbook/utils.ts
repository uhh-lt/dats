import { ActionRead } from "../../api/openapi/models/ActionRead.ts";
import { ActionTargetObjectType } from "../../api/openapi/models/ActionTargetObjectType.ts";
import { ActionType } from "../../api/openapi/models/ActionType.ts";
import { AnnotationDocumentRead } from "../../api/openapi/models/AnnotationDocumentRead.ts";
import { BBoxAnnotationReadResolvedCode } from "../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";
import { ProjectRead } from "../../api/openapi/models/ProjectRead.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";

export const formatTimestampAsTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const actionType2Color: Record<ActionType, string> = {
  CREATE: "rgba(0, 255, 0, 0.2)",
  READ: "rgba(10, 10, 10, 0.2)",
  UPDATE: "rgba(255, 180, 30, 0.2)",
  DELETE: "rgba(255, 87, 51, 0.2)",
};

export const actionTarget2Title: Record<ActionTargetObjectType, string> = {
  memo: "Memo",
  annotation_document: "Annotations",
  source_document: "Document",
  code: "Code",
  span_annotation: "Span Annotation",
  span_group: "Span Group",
  bbox_annotation: "BBox Annotation",
  project: "Project",
  document_tag: "Document Tag",
};

export const action2TargetTitle = (action: ActionRead): string | null | undefined => {
  // the most recent version of the target object ...
  let obj = action.after_state; // ... is the after state for CREATE and UPDATE actions
  if (action.action_type === ActionType.DELETE) {
    // ... is the before state for DELETE actions
    obj = action.before_state;
  }

  // if there is no object, an error occured in the backend!
  if (obj === undefined || obj == null) {
    return undefined;
  }

  // parse the JSON string into an object
  try {
    const parsedObject = JSON.parse(obj);
    switch (action.target_type) {
      case ActionTargetObjectType.MEMO:
        return (parsedObject as MemoRead).title;
      case ActionTargetObjectType.PROJECT:
        return (parsedObject as ProjectRead).title;
      case ActionTargetObjectType.DOCUMENT_TAG:
        return (parsedObject as DocumentTagRead).name;
      case ActionTargetObjectType.SOURCE_DOCUMENT:
        return (parsedObject as SourceDocumentRead).filename;
      case ActionTargetObjectType.SPAN_ANNOTATION: {
        const spanAnno = parsedObject as SpanAnnotationReadResolved;
        return `${spanAnno.span_text} (${spanAnno.code.name})`;
      }
      case ActionTargetObjectType.BBOX_ANNOTATION: {
        const bboxAnno = parsedObject as BBoxAnnotationReadResolvedCode;
        return `Code: ${bboxAnno.code.name} Coordinates: ${bboxAnno.x_min}, ${bboxAnno.y_min}, ${bboxAnno.x_max}, ${bboxAnno.y_max}`;
      }
      case ActionTargetObjectType.CODE:
        return (parsedObject as CodeRead).name;
      case ActionTargetObjectType.ANNOTATION_DOCUMENT:
        return `Document #${(parsedObject as AnnotationDocumentRead).source_document_id}`;
      default:
        return undefined;
    }
  } catch (e) {
    return undefined;
  }
};

export const parseActionState = (input: string | null | undefined | null) => {
  if (input === undefined) {
    throw new Error("state is undefined!");
  }

  if (input === null) {
    throw new Error("state is null!");
  }

  if (input.trim() === "") {
    throw new Error("state is '' (empty)!");
  }

  try {
    return JSON.parse(input);
  } catch (e) {
    throw new Error("Could not parse state as JSON (json is invalid)!");
  }
};

export const generateActionStrings = (before: string | null | undefined, after: string | null | undefined) => {
  const result = {
    before: "",
    after: "",
  };

  let beforeObj: Record<string, unknown> = {};
  try {
    beforeObj = parseActionState(before);
  } catch (e) {
    if (e instanceof Error) {
      result.before = e.message;
    }
  }

  let afterObj: Record<string, unknown> = {};
  try {
    afterObj = parseActionState(after);
  } catch (e) {
    if (e instanceof Error) {
      result.after = e.message;
    }
  }

  if (result.before === "" && result.after === "") {
    const keysToDelete = [];
    for (const [key, value] of Object.entries(beforeObj)) {
      const afterProp = afterObj[key];
      if (value === afterProp) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      delete beforeObj[key];
      delete afterObj[key];
    }

    result.before = JSON.stringify(beforeObj, null, 2);
    result.after = JSON.stringify(afterObj, null, 2);
  }

  if (result.before === "") {
    result.before = JSON.stringify(beforeObj, null, 2);
  }

  if (result.after === "") {
    result.after = JSON.stringify(afterObj, null, 2);
  }

  return result;
};
