import {
  ActionRead,
  ActionTargetObjectType,
  ActionType,
  BBoxAnnotationRead,
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  MemoRead,
  ProjectRead,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../api/openapi";

export const formatTimestampAsTime = (timestamp: string): string => {
  let date = new Date(timestamp);
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const actionType2Color: Record<ActionType, string> = {
  CREATE: "rgba(0, 255, 0, 0.2)",
  UPDATE: "rgba(255, 180, 30, 0.2)",
  DELETE: "rgba(255, 87, 51, 0.2)",
};

export const actionTarget2Title: Record<ActionTargetObjectType, string> = {
  memo: "Memo",
  annotation_document: "Annotation Document",
  source_document: "Document",
  code: "Code",
  span_annotation: "Span Annotation",
  span_group: "Span Group",
  bbox_annotation: "BBox Annotation",
  project: "Project",
  document_tag: "Document Tag",
};

export const action2TargetTitle = (action: ActionRead): string | undefined => {
  // the most recent version of the target object ...
  let obj = action.after_state; // ... is the after state for CREATE and UPDATE actions
  if (action.action_type === ActionType.DELETE) {
    // ... is the before state for DELETE actions
    obj = action.before_state;
  }

  // if there is no object, an error occured in the backend!
  if (obj === undefined) {
    return undefined;
  }

  console.log(obj);

  // parse the JSON string into an object
  try {
    const parsedObject: any = JSON.parse(obj);
    switch (action.target_type) {
      case ActionTargetObjectType.MEMO:
        return (parsedObject as MemoRead).title;
      case ActionTargetObjectType.PROJECT:
        return (parsedObject as ProjectRead).title;
      case ActionTargetObjectType.DOCUMENT_TAG:
        return (parsedObject as DocumentTagRead).title;
      case ActionTargetObjectType.SOURCE_DOCUMENT:
        return (parsedObject as SourceDocumentRead).filename;
      case ActionTargetObjectType.SPAN_ANNOTATION:
        const spanAnno = parsedObject as SpanAnnotationReadResolved;
        return `${spanAnno.span_text} (${spanAnno.code.name})`;
      case ActionTargetObjectType.BBOX_ANNOTATION:
        const bboxAnno = parsedObject as BBoxAnnotationRead;
        return `Code: ${bboxAnno.current_code_id} Coordinates: ${bboxAnno.x_min}, ${bboxAnno.y_min}, ${bboxAnno.x_max}, ${bboxAnno.y_max}`;
      case ActionTargetObjectType.CODE:
        return (parsedObject as CodeRead).name;
      default:
        return undefined;
    }
  } catch (e) {
    return undefined;
  }
};

export const prettyPrintActionState = (input: string | undefined | null): string => {
  if (input === undefined) {
    return "state is undefined!";
  }

  if (input === null) {
    return "state is null!";
  }

  if (input.trim() === "") {
    return "state is '' (empty)!";
  }

  try {
    const parsedObject: any = JSON.parse(input);
    return JSON.stringify(parsedObject, null, 2);
  } catch (e) {
    return "Could not parse state as JSON (json is invalid)!";
  }
};
