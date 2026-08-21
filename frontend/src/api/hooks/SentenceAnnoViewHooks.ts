import { SearchEntityType } from "@models/SearchEntityType";
import { SentenceSearchViewRead } from "@models/SentenceSearchViewRead";
import { QueryKey } from "./QueryKey";
import { createSearchViewHooks } from "./SearchViewHooks";

export const SentenceAnnoViewHooks = createSearchViewHooks<SentenceSearchViewRead>(
  SearchEntityType.SENTENCE_ANNOTATION,
  QueryKey.SENTENCE_ANNO_VIEWS,
);
