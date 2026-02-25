import { MyFilterExpression } from "../../../../../../../../../../filterUtils";

export interface SharedFilterValueSelectorProps {
  filterExpression: MyFilterExpression;
  onChangeValue(id: string, value: string | number | boolean | string[]): void;
}
