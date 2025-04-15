/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BBoxAnnotationNodeData } from "./BBoxAnnotationNodeData";
import type { BorderNodeData } from "./BorderNodeData";
import type { CodeNodeData } from "./CodeNodeData";
import type { MemoNodeData } from "./MemoNodeData";
import type { NoteNodeData } from "./NoteNodeData";
import type { SdocNodeData } from "./SdocNodeData";
import type { SentenceAnnotationNodeData } from "./SentenceAnnotationNodeData";
import type { SpanAnnotationNodeData } from "./SpanAnnotationNodeData";
import type { TagNodeData } from "./TagNodeData";
import type { TextNodeData } from "./TextNodeData";
import type { WhiteboardNodeType } from "./WhiteboardNodeType";
import type { XYPosition } from "./XYPosition";
export type WhiteboardNode_Input = {
  /**
   * ID of the node
   */
  id: string;
  /**
   * Type of the node
   */
  type?: WhiteboardNodeType | string;
  /**
   * Data of the node
   */
  data:
    | TextNodeData
    | NoteNodeData
    | BorderNodeData
    | SdocNodeData
    | MemoNodeData
    | CodeNodeData
    | TagNodeData
    | SpanAnnotationNodeData
    | SentenceAnnotationNodeData
    | BBoxAnnotationNodeData;
  /**
   * Position of the node
   */
  position: XYPosition;
  /**
   * Width of the node
   */
  width?: number | null;
  /**
   * Height of the node
   */
  height?: number | null;
};
