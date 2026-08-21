import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";
import { QueryKey } from "./QueryKey";
import { createSearchViewHooks } from "./SearchViewHooks";

export const MemoViewHooks = createSearchViewHooks<MemoSearchViewRead>(SearchEntityType.MEMO, QueryKey.MEMO_VIEWS);
