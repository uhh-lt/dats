import { FilterValueType } from "@models/FilterValueType";
import { memo, useMemo } from "react";
import { ColumnInfo } from "../../../../../filterUtils";
import { AttachedObjectTypeValueSelector } from "./components/AttachedObjectTypeValueSelector";
import { AttachedObjectValueSelector } from "./components/AttachedObjectValueSelector";
import { CodeIdValueSelector } from "./components/CodeIdValueSelector";
import { DefaultValueSelector } from "./components/DefaultValueSelector";
import { DocTypeValueSelector } from "./components/DocTypeValueSelector";
import { FolderIdValueSelector } from "./components/FolderIdValueSelector";
import { SpanAnnotationValueSelector } from "./components/SpanAnnotationValueSelector";
import { TagIdValueSelector } from "./components/TagIdValueSelector";
import { UserIdValueSelector } from "./components/UserIdValueSelector";
import { SharedFilterValueSelectorProps } from "./types/SharedFilterValueSelectorProps";

interface FilterValueSelectorProps extends SharedFilterValueSelectorProps {
  columnInfoMap: Record<string, ColumnInfo>;
}

export const FilterValueSelector = memo(
  ({ filterExpression, onChangeValue, columnInfoMap }: FilterValueSelectorProps) => {
    const filterInfo = useMemo(() => columnInfoMap[filterExpression.column], [columnInfoMap, filterExpression.column]);

    switch (filterInfo.value) {
      case FilterValueType.ATTACHED_OBJECT_TYPE:
        return <AttachedObjectTypeValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.ATTACHED_OBJECT:
        return <AttachedObjectValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.TAG_ID:
        return <TagIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.CODE_ID:
        return <CodeIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
      case FilterValueType.FOLDER_ID:
        return <FolderIdValueSelector filterExpression={filterExpression} onChangeValue={onChangeValue} />;
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
