/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HorizontalAlign } from "./HorizontalAlign";
import type { VerticalAlign } from "./VerticalAlign";
export type TextNodeData = {
  /**
   * Text of the text
   */
  text: string;
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
   * Strikethroughness of the text
   */
  strikethrough: boolean;
  /**
   * Font size of the text
   */
  fontSize: number;
  /**
   * Font family of the text
   */
  fontFamily: string;
  type: string;
};
