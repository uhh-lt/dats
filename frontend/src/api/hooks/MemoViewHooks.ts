import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";
import { createSearchViewHooks } from "./SearchViewHooks";

export const MemoViewHooks = createSearchViewHooks<MemoSearchViewRead>(SearchEntityType.MEMO);
