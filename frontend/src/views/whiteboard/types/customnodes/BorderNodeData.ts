import { BackgroundColorData } from "../base/BackgroundColorData";
import { BorderData } from "../base/BorderData";
import { TextData } from "../base/TextData";

export interface BorderNodeData extends BackgroundColorData, TextData, BorderData {}
