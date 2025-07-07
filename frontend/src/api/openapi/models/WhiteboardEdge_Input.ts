/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WhiteboardEdgeData_Input } from "./WhiteboardEdgeData_Input";
export type WhiteboardEdge_Input = {
  /**
   * ID of the edge
   */
  id: string;
  /**
   * Type of the edge
   */
  type?: string | null;
  /**
   * Source node ID
   */
  source: string;
  /**
   * Source handle position
   */
  sourceHandle?: string | null;
  /**
   * Target node ID
   */
  target: string;
  /**
   * Target handle position
   */
  targetHandle?: string | null;
  /**
   * Data of the edge
   */
  data?: WhiteboardEdgeData_Input | null;
  /**
   * Style of the edge
   */
  style?: Record<string, any> | null;
  /**
   * Marker end of the edge
   */
  markerEnd?: Record<string, any> | string;
  /**
   * Marker start of the edge
   */
  markerStart?: Record<string, any> | string;
};
