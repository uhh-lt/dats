import React, { Fragment, useMemo } from "react";
import "./Annotator.css";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import RightClickMenu from "./RightClickMenu";
import {
  AnnotationDocumentRead,
  AnnotationDocumentService,
  ProjectService,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import SdocHooks from "../../../api/SdocHooks";
import { flatten, range } from "lodash";
import { ICode } from "./ICode";
import { ISpanAnnotation } from "./ISpanAnnotation";
import { addAnno, AnnoActions, editAnnoWithNewCode, removeAnno } from "../annoSlice";

interface AnnotatorNEWProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
  visibleAdocIds: number[];
}

const selectionIsEmpty = (selection: Selection): boolean => {
  let position = selection.anchorNode!.compareDocumentPosition(selection.focusNode!);

  return position === 0 && selection.focusOffset === selection.anchorOffset;
};

const selectionIsBackwards = (selection: Selection) => {
  if (selectionIsEmpty(selection)) return false;

  let position = selection.anchorNode!.compareDocumentPosition(selection.focusNode!);

  let backward = false;
  if ((!position && selection.anchorOffset > selection.focusOffset) || position === Node.DOCUMENT_POSITION_PRECEDING)
    backward = true;

  return backward;
};

// function tokenize(text: string): Token[][] {
//     const lines = text.split("\n");
//     let i = 0;
//     const tokens = lines.map((line) => {
//         let tokensInLine = line.split(" ").map((t) => ({ index: i++, text: t, newLine: false, whitespace: true }));
//         if (tokensInLine.length) tokensInLine[tokensInLine.length - 1].newLine = true;
//         return tokensInLine;
//     });
//     return tokens;
// }

const emptyArr: string[] = [];

const Tok = (props: { ti: number; text: string; newLine: number; whitespace: boolean }) => {
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

  let spans =
    useAppSelector((state) => {
      return state.annotations.spansPerToken[props.ti];
    }) || emptyArr;
  spans = spans.filter((span) => span.code && hiddenCodeIds.indexOf(span.code.id) === -1);

  const printTags = useAppSelector((state) => state.annotations.settings.printTags);

  const markCount = spans.length;
  const h = 100 / markCount + "%";
  const end = props.ti + 1;
  const stackedMarks = spans.map((s, i) => (
    <div
      key={i}
      className={
        "mark c" +
        s.code?.id +
        (markCount === 1 && s.begin === props.ti ? " start" : "") +
        (markCount === 1 && s.end === end ? " end" : "")
      }
      style={{ backgroundColor: s.code?.color, height: h, top: (100 / markCount) * i + "%" }}
    ></div>
  ));
  const spanEnds = spans.filter((s) => s.begin === props.ti);

  const spanGroups = spanEnds.length > 0 && (
    <span className={"spangroup " + printTags}>
      {spanEnds.map((s, i) => (
        <span key={i} style={printTags === "above" ? { color: s.code?.color } : { backgroundColor: s.code?.color }}>
          {" "}
          {s.code?.name} {s.groups}
        </span>
      ))}{" "}
    </span>
  );
  return (
    <Fragment>
      <span t-i={props.ti} className="tok">
        {spanGroups}
        {props.text}
        {props.whitespace && " "}
        {stackedMarks}
      </span>
      {props.newLine > 0 && range(props.newLine).map((i) => <br key={i}></br>)}
    </Fragment>
  );
};

export const Annotator = ({ sdoc, adoc, visibleAdocIds }: AnnotatorNEWProps) => {
  const createAnnotationMutation = SpanAnnotationHooks.useCreateAnnotation({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Added code ${data.id}`,
        severity: "success",
      });
    },
  });

  const dispatch = useAppDispatch();

  const handleMouseUp = (code?: ICode, span?: ISpanAnnotation) => {
    // if (!this.props.onChange) return

    const selection = window.getSelection();

    if (selection === null || selectionIsEmpty(selection)) return;

    if (
      !selection.anchorNode!.parentElement!.hasAttribute("t-i") ||
      !selection.focusNode!.parentElement!.hasAttribute("t-i")
    ) {
      //selection.empty()
      return false;
    }

    let begin = parseInt(selection.anchorNode!.parentElement!.getAttribute("t-i")!);
    let end = parseInt(selection.focusNode!.parentElement!.getAttribute("t-i")!);

    if (selectionIsBackwards(selection)) {
      [begin, end] = [end, begin];
    }
    end += 1;
    console.log(begin, " ", end);

    dispatch(addAnno({ i: 0, begin, end, code }));

    // props.onChange([...props.value, getSpan({ start, end, tokens: props.tokens.slice(start, end) })])
    selection.empty();
  };

  const onModify = (code: ICode, anno?: ISpanAnnotation) => {
    dispatch(editAnnoWithNewCode({ code, anno }));
  };

  const invalidSelection = () => {
    const selection = window.getSelection();

    if (selection === null || selectionIsEmpty(selection)) return true;

    if (
      !selection.anchorNode!.parentElement!.hasAttribute("t-i") ||
      !selection.focusNode!.parentElement!.hasAttribute("t-i")
    ) {
      return true;
    }
  };

  const onDelete = (span: ISpanAnnotation | null) => {
    dispatch(removeAnno(span));
  };

  const onSetGroups = (span: ISpanAnnotation, groups: number[]) => {
    dispatch(AnnoActions.setGroups({ ...span, groups }));
  };

  const printTags = useAppSelector((state) => state.annotations.settings.printTags);

  const styles: React.CSSProperties =
    printTags === "inline"
      ? {
          // whiteSpace: "pre-wrap",
          // contentVisibility: "auto"
          lineHeight: "26px",
        }
      : {
          lineHeight: "36px",
        };

  const tokQuery = SdocHooks.useGetDocumentTokens(sdoc.id).data;
  const tokens = useMemo(() => {
    let i = 0;
    const offsets = tokQuery?.token_character_offsets || [];
    return [
      tokQuery?.tokens.map((t) => {
        return {
          beginChar: offsets[i][0],
          endChar: offsets[i][1],
          index: i++,
          text: t,
          whitespace: offsets.length > i && offsets[i][0] - offsets[i - 1][1] > 0,
          newLine: t.split("\n").length - 1,
        };
      }) || [],
    ];
  }, [tokQuery]);

  //const tokens = tokenize(sdoc.content);

  const annotations = visibleAdocIds.map((adocId) =>
    AnnotationDocumentService.getAllSpanAnnotationsAdocAdocIdSpanAnnotationsGet({
      adocId: adocId,
      resolve: true,
    })
  );
  const promises = Promise.all(annotations);
  promises.then((result) => {
    const annos = flatten(result) as SpanAnnotationReadResolved[];
    const initialAnnos: ISpanAnnotation[] = annos.map((a, i) => ({
      i: i,
      id: a.id,
      begin: a.begin_token,
      end: a.end_token,
      groups: undefined,
      code: a.code ? { id: a.code.id, name: a.code.name, color: a.code.color } : undefined,
    }));

    ProjectService.getProjectCodesProjectProjIdCodeGet({ projId: sdoc.project_id }).then((codes) => {
      dispatch(
        AnnoActions.set({
          tokens: tokens.flat(),
          annos: initialAnnos,
          numTokens: tokens.length,
          adoc: adoc,
          codes: codes,
          projectId: sdoc.project_id,
        })
      );
    });
  });

  // const annotations = AnnotationDocumentService.getAllSpanAnnotationsAdocAdocIdSpanAnnotationsGet({
  //   adocId: adoc.id,
  //   resolve: true,
  // });
  // const codes = ProjectService.getProjectCodesProjectProjIdCodeGet({ projId: sdoc.project_id });
  //
  // const promises = Promise.all([annotations, codes]);
  // promises.then((result) => {
  //   const annos = result[0] as SpanAnnotationReadResolved[];
  //   const initialAnnos: ISpanAnnotation[] = annos.map((a, i) => ({
  //     i: i,
  //     id: a.id,
  //     begin: a.begin_token,
  //     end: a.end_token,
  //     groups: undefined,
  //     code: a.code ? { id: a.code.id, name: a.code.name, color: a.code.color } : undefined,
  //   }));
  //
  //   const projectCodes = result[1] as CodeRead[];
  //
  //   dispatch(
  //     AnnoActions.set({
  //       tokens: tokens.flat(),
  //       annos: initialAnnos,
  //       numTokens: tokens.length,
  //       adoc: adoc,
  //       codes: projectCodes,
  //       projectId: sdoc.project_id,
  //     })
  //   );
  // });

  // const spansPerToken = new Array(tokens.length);

  // initialAnnos.forEach((a) => {
  //     const { i, start, end, tag } = a;
  //     for (let t = start; t < end; t++)
  //       if (spansPerToken[t] === undefined) spansPerToken[t] = [a];
  //       else spansPerToken[t].push(a);
  //   });

  // console.log(spansPerToken[0]);

  let tokenId = 0;
  console.time("renderAnnos");
  const result = (
    <div style={styles} className="myFlexFillAllContainer">
      <RightClickMenu
        onAdd={handleMouseUp}
        onModify={onModify}
        invalidSelection={invalidSelection}
        onDelete={onDelete}
        onSetGroups={onSetGroups}
      >
        {tokens.map((p, pId) => (
          <div key={pId} className="para">
            {p.map((t) => (
              <Tok key={tokenId} ti={tokenId++} {...t}></Tok>
            ))}
          </div>
        ))}
      </RightClickMenu>
    </div>
  );

  console.timeEnd("renderAnnos");
  return result;
};
