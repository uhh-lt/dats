import {
  ColumnInfo,
  MyFilter,
  MyFilterExpression,
  filterOperator2FilterOperatorType,
  getDefaultOperator,
} from "@core/filter";
import { getMetadataValue } from "@core/sdoc-metadata";
import { IDListOperator } from "@models/IDListOperator";
import { ListOperator } from "@models/ListOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { SdocColumns } from "@models/SdocColumns";
import { SourceDocumentMetadataUpdate } from "@models/SourceDocumentMetadataUpdate";

const cloneFilter = (filter: MyFilter<SdocColumns>): MyFilter<SdocColumns> => {
  return JSON.parse(JSON.stringify(filter)) as MyFilter<SdocColumns>;
};

export const addKeywordFilter = (
  appliedFilter: MyFilter<SdocColumns>,
  keywordMetadataIds: number[],
  keyword: string,
): MyFilter<SdocColumns> => {
  const nextFilter = cloneFilter(appliedFilter);
  const filterItems: MyFilterExpression<SdocColumns>[] = keywordMetadataIds.map((keywordMetadataId) => {
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

export const addTagFilter = (appliedFilter: MyFilter<SdocColumns>, tagId: number | string): MyFilter<SdocColumns> => {
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

export const addSpanAnnotationFilter = (
  appliedFilter: MyFilter<SdocColumns>,
  codeId: number,
  spanText: string,
): MyFilter<SdocColumns> => {
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
  appliedFilter: MyFilter<SdocColumns>,
  metadata: SourceDocumentMetadataUpdate,
  projectMetadata: ProjectMetadataRead,
  column2Info: Record<string, ColumnInfo>,
): MyFilter<SdocColumns> => {
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
