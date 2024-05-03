import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead";

export interface ChartDataPoint {
  tags: DocumentTagRead[];
  sdocIds: number[];
  count: number;
  fixedSampleSdocIds: number[];
  fixedSampleCount: number;
  relativeSampleSdocIds: number[];
  relativeSampleCount: number;
}
