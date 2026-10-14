import { createSearchViewHooks } from "@core/workspace";
import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";

// the saved search views of the memo workspace
export const MemoViewHooks = createSearchViewHooks<MemoSearchViewRead>(SearchEntityType.MEMO);
