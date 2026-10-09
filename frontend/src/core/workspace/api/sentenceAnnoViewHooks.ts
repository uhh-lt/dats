import { SearchEntityType } from "@models/SearchEntityType";
import { SentenceSearchViewRead } from "@models/SentenceSearchViewRead";
import { createSearchViewHooks } from "./searchViewHooks";

export const SentenceAnnoViewHooks = createSearchViewHooks<SentenceSearchViewRead>(
  SearchEntityType.SENTENCE_ANNOTATION,
);
