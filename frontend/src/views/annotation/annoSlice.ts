import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AnnotationDocumentRead,
  CodeCreate,
  CodeService,
  SpanAnnotationCreate,
  SpanAnnotationService,
} from "../../api/openapi";
import { RootState } from "../../store/store";
import SnackbarAPI from "../../features/snackbar/SnackbarAPI";
import { ICode } from "./Annotator/ICode";
import { ISettings } from "./Annotator/ISettings";
import { IToken } from "./Annotator/IToken";
import { ISpanAnnotation } from "./Annotator/ISpanAnnotation";

export interface AnnoState {
  annotations: ISpanAnnotation[];
  tokens: IToken[];
  spansPerToken: ISpanAnnotation[][];
  annCount: number;
  lastAnnoIdx: number;
  codes: ICode[];
  codesForSelection: ICode[];
  selectedTokenIndex: number;
  spanGroups: number[];
  settings: ISettings;
  adoc: AnnotationDocumentRead;
  projectId: number;

  selectedDocumentTagId: number | undefined;
  selectedCodeId: number | undefined;
  expandedCodeIds: string[];
  hiddenCodeIds: number[];
  visibleAdocIds: number[];
}

const initialState: AnnoState = {
  annotations: [],
  tokens: [],
  spansPerToken: [],
  annCount: 0,
  lastAnnoIdx: -1,
  codes: [],
  codesForSelection: [],
  selectedTokenIndex: -1,
  spanGroups: [1],
  settings: {
    printTags: "inline",
  },
  adoc: {
    source_document_id: 0,
    user_id: 0,
    id: 0,
    created: "",
    updated: "",
  },
  projectId: 0,
  selectedDocumentTagId: undefined,
  selectedCodeId: undefined,
  expandedCodeIds: [],
  hiddenCodeIds: [],
  visibleAdocIds: [],
};

const addAnnoServer = createAsyncThunk(
  "annotatins/addAnnoServer",
  async (args: { idx: number; requestBody: SpanAnnotationCreate }, thunkAPI) => {
    const response = await SpanAnnotationService.addSpanAnnotationSpanPut({ requestBody: args.requestBody });
    return { idx: args.idx, id: response.id };
  }
);

export const addAnno = createAsyncThunk("annotations/addAnno", async (info: ISpanAnnotation, thunkAPI) => {
  const state = (thunkAPI.getState() as RootState).annotations;
  const { begin, end, code } = info;
  const myCode = code ? code : state.codes[0];
  const idx = state.annotations.findIndex((span) => span.begin > begin || (span.begin === begin && span.end > end));
  thunkAPI.dispatch(AnnoActions.add(info));
  const span_text = state.tokens
    .slice(begin, end)
    .map((t) => t.text)
    .join(" ");
  thunkAPI.dispatch(
    addAnnoServer({
      idx,
      requestBody: {
        annotation_document_id: state.adoc.id,
        begin: state.tokens[begin].beginChar,
        end: state.tokens[end - 1].endChar,
        begin_token: begin,
        end_token: end,
        current_code_id: myCode.id,
        span_text,
      },
    })
  );
});

const editAnnoWithNewCodeServer = createAsyncThunk(
  "annotations/editAnnoWithNewCodeServer",
  async (args: { spanIndex: number; codeIndex: number; spanId: number; codeCreate: CodeCreate }, thunkAPI) => {
    const responseAddCode = await CodeService.createNewCodeCodePut({
      requestBody: args.codeCreate,
    });
    const spanRead = await SpanAnnotationService.updateByIdSpanSpanIdPatch({
      spanId: args.spanId,
      resolve: false,
      requestBody: {
        current_code_id: responseAddCode.id,
      },
    });
    return { spanIndex: args.spanIndex, codeIndex: args.codeIndex, code: responseAddCode, span: spanRead };
  }
);

export const editAnnoWithNewCode = createAsyncThunk(
  "annotations/editAnnoWithNewCode",
  async (args: { code: ICode; anno?: ISpanAnnotation }, thunkAPI) => {
    const state = (thunkAPI.getState() as RootState).annotations;
    const { code, anno } = args;
    const annoIdx = anno ? state.annotations.findIndex((a) => a.i === anno.i) : state.lastAnnoIdx;
    if (annoIdx >= 0 || anno) {
      const spanId = state.annotations[annoIdx].id!;
      if (!code.color) {
        const codeIndex = state.codes.length;
        code.color = "gray";
        thunkAPI.dispatch(AnnoActions.addCode(code));
        thunkAPI.dispatch(AnnoActions.addCodeToSpan({ spanIndex: annoIdx, code }));
        thunkAPI.dispatch(
          editAnnoWithNewCodeServer({
            spanIndex: annoIdx,
            spanId,
            codeIndex,
            codeCreate: {
              name: code.name,
              description: "Created on the fly",
              project_id: state.projectId,
              user_id: state.adoc.user_id,
              color: "gray",
              parent_code_id: state.selectedCodeId,
            },
          })
        );
      } else {
        thunkAPI.dispatch(AnnoActions.addCodeToSpan({ spanIndex: annoIdx, code }));
        thunkAPI.dispatch(AnnoActions.moveCodeToTop(code));
        try {
          await SpanAnnotationService.updateByIdSpanSpanIdPatch({
            spanId,
            requestBody: {
              current_code_id: code.id,
            },
          });
        } catch (e) {
          SnackbarAPI.openSnackbar({
            text: "editTag failed on server",
            severity: "error",
          });
        }
      }
    }
  }
);

const removeAnnoServer = createAsyncThunk("annotations/removeAnnoServer", async (spanId: number) => {
  SpanAnnotationService.deleteByIdSpanSpanIdDelete({ spanId });
});

export const removeAnno = createAsyncThunk(
  "annotations/removeAnno",
  async (spanAnno: ISpanAnnotation | null, thunkAPI) => {
    const state = (thunkAPI.getState() as RootState).annotations;
    let anno: ISpanAnnotation;
    if (spanAnno) {
      anno = spanAnno;
      const idx = state.annotations.findIndex((a) => a.i === anno.i);
      if (idx === -1) return;
    } else if (state.lastAnnoIdx) {
      anno = state.annotations[state.lastAnnoIdx];
    } else return;
    thunkAPI.dispatch(AnnoActions.remove(anno));
    thunkAPI.dispatch(removeAnnoServer(anno.id!));
  }
);

export const annoSlice = createSlice({
  name: "anno",
  initialState,
  // The `reducers` field lets us define reducers and generate associated actions
  reducers: {
    add: (state, action: PayloadAction<ISpanAnnotation>) => {
      console.time("add");
      let { begin, end, code } = action.payload;

      code = code ? code : state.codes[0];

      const old = state.annotations;
      const idx = state.annotations.findIndex((span) => span.begin > begin || (span.begin === begin && span.end > end));
      const toAdd = { i: state.annCount, begin, end, code };

      state.lastAnnoIdx = idx >= 0 ? idx : old.length;
      const newArr = idx >= 0 ? [...old.slice(0, idx), toAdd, ...old.slice(idx)] : [...old, toAdd];
      state.annotations = newArr;
      state.annCount++;

      for (let i = begin; i < end; i++)
        if (state.spansPerToken[i] === undefined) state.spansPerToken[i] = [toAdd];
        else state.spansPerToken[i].push(toAdd);
      console.timeEnd("add");
    },

    set: (
      state,
      action: PayloadAction<{
        tokens: IToken[];
        annos: ISpanAnnotation[];
        numTokens: number;
        adoc: AnnotationDocumentRead;
        codes: ICode[];
        projectId: number;
      }>
    ) => {
      state.tokens = action.payload.tokens;
      state.projectId = action.payload.projectId;
      state.annotations = action.payload.annos;
      state.spansPerToken = new Array(action.payload.numTokens);
      state.annCount = state.annotations.length;
      state.adoc = action.payload.adoc;
      state.codes = action.payload.codes;
      state.annotations.forEach((a) => {
        const { begin: start, end } = a;
        for (let t = start; t < end; t++)
          if (state.spansPerToken[t] === undefined) state.spansPerToken[t] = [a];
          else state.spansPerToken[t].push(a);
      });
    },

    addCode: (state, action: PayloadAction<ICode>) => {
      state.codes.unshift(action.payload);
    },

    moveCodeToTop: (state, action: PayloadAction<ICode>) => {
      // makes most recently used order
      const codeName = action.payload.name;
      const idx = state.codes.findIndex((t) => t.name === codeName);
      const code = state.codes[idx];
      state.codes.splice(idx, 1);
      state.codes.unshift(code);
    },

    addCodeToSpan: (state, action: PayloadAction<{ spanIndex: number; code: ICode }>) => {
      const { spanIndex, code } = action.payload;
      const oldAnn = state.annotations[spanIndex];
      state.annotations[spanIndex].code = code;
      const { begin: start, end } = state.annotations[spanIndex];
      for (let i = start; i < end; i++) {
        const oldColors = state.spansPerToken[i];
        const idx = oldColors.findIndex((o) => o.i === oldAnn!.i);
        state.spansPerToken[i][idx].code = code;
        state.spansPerToken[i] = state.spansPerToken[i].slice();
      }
    },

    remove: (state, action: PayloadAction<ISpanAnnotation>) => {
      const { begin, end, i } = action.payload;
      state.annotations.splice(action.payload.i, 1);
      for (let j = begin; j < end; j++) {
        const oldColors = state.spansPerToken[j];
        const idx = oldColors.findIndex((o) => o.i === i);
        state.spansPerToken[j].splice(idx, 1);
      }
    },

    setGroups: (state, action: PayloadAction<ISpanAnnotation>) => {
      const span = action.payload;
      const { begin: start, end, i } = span;
      const idx = state.annotations.findIndex((s) => s.i === i);
      state.annotations[idx] = span;
      const lastGroup = state.spanGroups[0];
      for (let g of span.groups!)
        if (g === lastGroup) {
          state.spanGroups.unshift(state.spanGroups.length + 1);
          break;
        }
      for (let j = start; j < end; j++) {
        const oldColors = state.spansPerToken[j];
        // const idx = oldColors.findIndex(o => o.i === i);
        // state.colors[j][idx].groups = span.groups;
        oldColors.find((o) => o.i === i)!.groups = span.groups;
      }
    },

    setCodesForSelection: (state, action: PayloadAction<ICode[]>) => {
      state.codesForSelection = action.payload;
    },

    toggleCodeVisibility: (state, action: PayloadAction<number[]>) => {
      if (action.payload.length === 0) {
        return;
      }
      console.log(action.payload);
      const codeId = action.payload[0];
      const hiddenCodeIds = state.hiddenCodeIds;
      if (hiddenCodeIds.indexOf(codeId) === -1) {
        // add codes
        action.payload.forEach((codeId) => {
          if (hiddenCodeIds.indexOf(codeId) === -1) {
            hiddenCodeIds.push(codeId);
          }
        });
      } else {
        // delete codes
        action.payload.forEach((codeId) => {
          const index = hiddenCodeIds.indexOf(codeId);
          if (index !== -1) {
            hiddenCodeIds.splice(index, 1);
          }
        });
      }
      state.hiddenCodeIds = hiddenCodeIds;
    },
    setSelectedParentCodeId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedCodeId = action.payload;
    },
    setExpandedParentCodeIds: (state, action: PayloadAction<string[]>) => {
      state.expandedCodeIds = action.payload;
    },
    setSelectedDocumentTagId: (state, action: PayloadAction<number | undefined>) => {
      state.selectedDocumentTagId = action.payload;
    },
    setVisibleAdocIds: (state, action: PayloadAction<number[]>) => {
      state.visibleAdocIds = action.payload;
    },
  },
  extraReducers(builder) {
    builder.addCase(addAnnoServer.fulfilled, (state, action) => {
      state.annotations[action.payload.idx].id = action.payload.id;
    });
    builder.addCase(addAnnoServer.rejected, (state, action) => {
      SnackbarAPI.openSnackbar({
        text: "addAnno failed on server",
        severity: "error",
      });
    });
    builder.addCase(editAnnoWithNewCodeServer.fulfilled, (state, action) => {
      const { spanIndex, code } = action.payload;
      state.annotations[action.payload.spanIndex].code = action.payload.code;
      if (state.codes[0].name === code.name) state.codes[0] = action.payload.code;
      else {
        const codeIdx = state.codes.findIndex((c) => c.name === code.name);
        state.codes[codeIdx] = code;
      }

      const iAnno = state.annotations[spanIndex].i;
      state.annotations[spanIndex].code = code;
      const { begin: start, end } = state.annotations[spanIndex];
      for (let i = start; i < end; i++) {
        const oldColors = state.spansPerToken[i];
        const idx = oldColors.findIndex((o) => o.i === iAnno);
        state.spansPerToken[i][idx].code = code;
      }
    });
    builder.addCase(editAnnoWithNewCodeServer.rejected, (state, action) => {
      SnackbarAPI.openSnackbar({
        text: "editAnnoWithNewCode failed on server",
        severity: "error",
      });
    });
    builder.addCase(removeAnnoServer.rejected, (state, action) => {
      SnackbarAPI.openSnackbar({
        text: "removeAnno failed on server",
        severity: "error",
      });
    });
  },
});

export const AnnoActions = annoSlice.actions;

// The function below is called a selector and allows us to select a value from
// the state. Selectors can also be defined inline where they're used instead of
// in the slice file. For example: `useSelector((state: RootState) => state.counter.value)`
export const isHiddenCodeId = (codeId: number) => (state: RootState) =>
  state.annotations.hiddenCodeIds.indexOf(codeId) !== -1;
export const selectSelectedDocumentTagId = (state: RootState) => state.annotations.selectedDocumentTagId;

export default annoSlice.reducer;
