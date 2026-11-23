/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The URLs of the files of a SourceDocument, relative to the content
 * server (`/content/`).
 */
export type SourceDocumentUrls = {
  /**
   * URL of the uploaded file of the SourceDocument
   */
  file_url: string;
  /**
   * URL of the WebP image of an image SourceDocument (None until it is computed)
   */
  image_url: string | null;
  /**
   * URL of the thumbnail of an image or video SourceDocument (None until it is computed)
   */
  thumbnail_url: string | null;
};
