import { SearchEntityType } from "@models/SearchEntityType";
import { SpanSearchViewRead } from "@models/SpanSearchViewRead";
import { createSearchViewHooks } from "./SearchViewHooks";

export const SpanAnnoViewHooks = createSearchViewHooks<SpanSearchViewRead>(SearchEntityType.SPAN_ANNOTATION);
