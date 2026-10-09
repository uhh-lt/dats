import { MemoSearchViewRead } from "@models/MemoSearchViewRead";
import { SearchEntityType } from "@models/SearchEntityType";
import { createSearchViewHooks } from "./searchViewHooks";

export const MemoViewHooks = createSearchViewHooks<MemoSearchViewRead>(SearchEntityType.MEMO);
