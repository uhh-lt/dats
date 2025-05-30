/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TopicCreate = {
  /**
   * ID of the parent topic, if any
   */
  parent_topic_id?: number | null;
  /**
   * ID of the aspect this topic belongs to
   */
  aspect_id: number;
  /**
   * Hierarchical level of the topic
   */
  level: number;
  /**
   * Name of the topic
   */
  name: string;
  /**
   * Description of the topic
   */
  description: string;
};
