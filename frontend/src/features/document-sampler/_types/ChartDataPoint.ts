import { TagRead } from "@models/TagRead";

export interface ChartDataPoint {
  tags: TagRead[];
  sdocIds: number[];
  count: number;
  fixedSampleSdocIds: number[];
  fixedSampleCount: number;
  relativeSampleSdocIds: number[];
  relativeSampleCount: number;
}
