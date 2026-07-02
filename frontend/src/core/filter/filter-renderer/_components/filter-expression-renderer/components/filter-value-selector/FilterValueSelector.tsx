import { FilterValueType } from "@models/FilterValueType";
import { memo, useMemo } from "react";
import { ColumnInfo } from "../../../../../filterUtils";
import { CodeIdValueSelector } from "./components/CodeIdValueSelector";
import { DefaultValueSelector } from "./components/DefaultValueSelector";
import { DocTypeValueSelector } from "./components/DocTypeValueSelector";
import { SpanAnnotationValueSelector } from "./components/SpanAnnotationValueSelector";
import { TagIdValueSelector } from "./components/TagIdValueSelector";
import { UserIdValueSelector } from "./components/UserIdValueSelector";
import { SharedFilterValueSelectorProps } from "./types/SharedFilterValueSelectorProps";

interface FilterValueSelectorProps extends SharedFilterValueSelectorProps {
  column2Info: Record<string, ColumnInfo>;
}

export const FilterValueSelector = memo(
  ({ filterExpression, onChangeValue, column2Info }: FilterValueSelectorProps) => {
    const filterInfo = useMemo(() => column2Info[filterExpression.column], [column2Info, filterExpression.column]);

    switch (filterInfo.value) {
      case FilterValueType.TAG_ID:
        return <TagIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.CODE_ID:
        return <CodeIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.USER_ID:
        return <UserIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.SPAN_ANNOTATION:
        return <SpanAnnotationValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.DOC_TYPE:
        return <DocTypeValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.INFER_FROM_OPERATOR:
        return (
          <DefaultValueSelector
            filterExpression={filterExpression}
            onChangeValue={onChangeValue}
            operator={filterInfo.operator}
          />
        );
      default:
        return <>FilterValueType not supported</>;
    }
  },
);
