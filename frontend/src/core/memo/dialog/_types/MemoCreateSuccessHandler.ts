import { MemoRead } from "@api/models/MemoRead";

export type MemoCreateSuccessHandler = ((memo: MemoRead) => void) | undefined;
