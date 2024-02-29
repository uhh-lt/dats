import { BackgroundColorData } from "../base/BackgroundColorData.ts";
import { BorderData } from "../base/BorderData.ts";
import { TextData } from "../base/TextData.ts";

export interface BorderNodeData extends BackgroundColorData, TextData, BorderData {}
