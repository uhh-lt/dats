import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";

export interface ChartDataPoint {
  tags: DocumentTagRead[];
  sdocIds: number[];
  count: number;
  fixedSampleSdocIds: number[];
  fixedSampleCount: number;
  relativeSampleSdocIds: number[];
  relativeSampleCount: number;
}
