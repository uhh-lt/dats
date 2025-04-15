/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HorizontalAlign } from "./HorizontalAlign";
import type { VerticalAlign } from "./VerticalAlign";
export type WhiteboardEdgeLabelData = {
  /**
   * Text of the text
   */
  text: string;
  /**
   * Variant of the text (e.g., 'h1', 'h2', 'subtitle', ...)
   */
  variant: string;
  /**
   * Text color of the text
   */
  color: string;
  /**
   * Horizontal alignment of the text
   */
  horizontalAlign: HorizontalAlign;
  /**
   * Vertical alignment of the text
   */
  verticalAlign: VerticalAlign;
  /**
   * Boldness of the text
   */
  bold: boolean;
  /**
   * Italicness of the text
   */
  italic: boolean;
  /**
   * Underlinedness of the text
   */
  underline: boolean;
  /**
   * Background color of the text
   */
  bgcolor: string;
  /**
   * Background color alpha of the text
   */
  bgalpha: number | null;
};
