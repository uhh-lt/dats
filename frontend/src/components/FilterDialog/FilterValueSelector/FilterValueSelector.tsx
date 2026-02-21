import { memo, useMemo } from "react";
import { FilterValueType } from "../../../api/openapi/models/FilterValueType.ts";
import { ColumnInfo } from "../filterUtils.ts";
import { CodeIdValueSelector } from "./components/CodeIdValueSelector.tsx";
import { DefaultValueSelector } from "./components/DefaultValueSelector.tsx";
import { DocTypeValueSelector } from "./components/DocTypeValueSelector.tsx";
import { SpanAnnotationValueSelector } from "./components/SpanAnnotationValueSelector.tsx";
import { TagIdValueSelector } from "./components/TagIdValueSelector.tsx";
import { UserIdValueSelector } from "./components/UserIdValueSelector.tsx";
import { SharedFilterValueSelectorProps } from "./types/SharedFilterValueSelectorProps.ts";

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
  }
);
