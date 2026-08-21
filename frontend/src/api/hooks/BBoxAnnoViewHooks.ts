import { BBoxSearchViewRead } from "@models/BBoxSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";
import { QueryKey } from "./QueryKey";
import { createSearchViewHooks } from "./SearchViewHooks";

export const BBoxAnnoViewHooks = createSearchViewHooks<BBoxSearchViewRead>(
  SearchEntityType.BBOX_ANNOTATION,
  QueryKey.BBOX_ANNO_VIEWS,
);
