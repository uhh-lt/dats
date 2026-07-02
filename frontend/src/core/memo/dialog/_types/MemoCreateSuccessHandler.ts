import { MemoRead } from "@models/MemoRead";

export type MemoCreateSuccessHandler = ((memo: MemoRead) => void) | undefined;
