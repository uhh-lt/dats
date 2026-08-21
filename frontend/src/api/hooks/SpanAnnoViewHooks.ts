import { SearchEntityType } from "@models/SearchEntityType";
import { SpanSearchViewRead } from "@models/SpanSearchViewRead";
import { QueryKey } from "./QueryKey";
import { createSearchViewHooks } from "./SearchViewHooks";

export const SpanAnnoViewHooks = createSearchViewHooks<SpanSearchViewRead>(
  SearchEntityType.SPAN_ANNOTATION,
  QueryKey.SPAN_ANNO_VIEWS,
);
