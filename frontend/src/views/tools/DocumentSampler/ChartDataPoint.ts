import { TagRead } from "../../../api/openapi/models/TagRead.ts";

export interface ChartDataPoint {
  tags: TagRead[];
  sdocIds: number[];
  count: number;
  fixedSampleSdocIds: number[];
  fixedSampleCount: number;
  relativeSampleSdocIds: number[];
  relativeSampleCount: number;
}
