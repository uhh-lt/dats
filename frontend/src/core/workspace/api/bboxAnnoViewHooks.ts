import { BBoxSearchViewRead } from "@models/BBoxSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";
import { createSearchViewHooks } from "./searchViewHooks";

export const BBoxAnnoViewHooks = createSearchViewHooks<BBoxSearchViewRead>(SearchEntityType.BBOX_ANNOTATION);
