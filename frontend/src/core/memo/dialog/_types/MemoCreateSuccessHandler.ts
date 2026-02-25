import { MemoRead } from "@api/openapi/models/MemoRead";

export type MemoCreateSuccessHandler = ((memo: MemoRead) => void) | undefined;
