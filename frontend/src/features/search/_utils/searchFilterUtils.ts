import { IDListOperator } from "@api/models/IDListOperator";
import { ListOperator } from "@api/models/ListOperator";
import { LogicalOperator } from "@api/models/LogicalOperator";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { SdocColumns } from "@api/models/SdocColumns";
import { SourceDocumentMetadataUpdate } from "@api/models/SourceDocumentMetadataUpdate";
import {
  ColumnInfo,
  MyFilter,
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  getDefaultOperator,
} from "@core/filter";
import { getMetadataValue } from "@core/sdoc-metadata";

const cloneFilter = <T = string>(filter: MyFilter<T>): MyFilter<T> => {
  return JSON.parse(JSON.stringify(filter)) as MyFilter<T>;
};

export const addKeywordFilter = (appliedFilter: MyFilter, keywordMetadataIds: number[], keyword: string): MyFilter => {
  const nextFilter = cloneFilter(appliedFilter);
  const filterItems: MyFilterExpression[] = keywordMetadataIds.map((keywordMetadataId) => {
    return {
      id: crypto.randomUUID(),
      column: keywordMetadataId,
      operator: ListOperator.LIST_CONTAINS,
      value: [keyword],
    };
  });

  nextFilter.items = [
    ...nextFilter.items,
    {
      id: crypto.randomUUID(),
      logic_operator: LogicalOperator.OR,
      items: filterItems,
    },
  ];
  return nextFilter;
};

export const addTagFilter = (appliedFilter: MyFilter, tagId: number | string): MyFilter => {
  const nextFilter = cloneFilter(appliedFilter);
  nextFilter.items = [
    ...nextFilter.items,
    {
      id: crypto.randomUUID(),
      column: SdocColumns.SD_TAG_ID_LIST,
      operator: IDListOperator.ID_LIST_CONTAINS,
      value: tagId,
    },
  ];
  return nextFilter;
};

export const addSpanAnnotationFilter = (appliedFilter: MyFilter, codeId: number, spanText: string): MyFilter => {
  const nextFilter = cloneFilter(appliedFilter);
  nextFilter.items = [
    ...nextFilter.items,
    {
      id: crypto.randomUUID(),
      column: SdocColumns.SD_SPAN_ANNOTATIONS,
      operator: ListOperator.LIST_CONTAINS,
      value: [codeId.toString(), spanText],
    },
  ];
  return nextFilter;
};

export const addMetadataFilter = (
  appliedFilter: MyFilter,
  metadata: SourceDocumentMetadataUpdate,
  projectMetadata: ProjectMetadataRead,
  column2Info: Record<string, ColumnInfo>,
): MyFilter => {
  const filterOperator = column2Info[projectMetadata.id.toString()]?.operator;
  if (!filterOperator) {
    return appliedFilter;
  }
  const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];
  const metadataValue = getMetadataValue(metadata, projectMetadata);
  if (metadataValue == null) {
    return appliedFilter;
  }

  const nextFilter = cloneFilter(appliedFilter);
  nextFilter.items = [
    ...nextFilter.items,
    {
      id: crypto.randomUUID(),
      column: projectMetadata.id,
      operator: getDefaultOperator(filterOperatorType),
      value: metadataValue,
    },
  ];
  return nextFilter;
};
