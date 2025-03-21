import { MyFilterExpression } from "../../filterUtils.ts";

export interface SharedFilterValueSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
}
