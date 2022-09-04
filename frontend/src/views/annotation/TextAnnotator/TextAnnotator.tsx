import {
  AnnotationDocumentRead,
  AnnotationDocumentService,
  BBoxAnnotationReadResolvedCode,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../../api/openapi";
import SdocHooks from "../../../api/SdocHooks";
import React, { MouseEvent, useMemo, useRef } from "react";
import { IToken } from "./IToken";
import Token from "./Token";
import "./TextAnnotator.css";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { selectionIsEmpty } from "./utils";
import CodeContextMenu, { CodeSelectorHandle } from "../ContextMenu/CodeContextMenu";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { QueryKey } from "../../../api/QueryKey";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks";
import { ICode } from "./ICode";

interface AnnotatorRemasteredProps {
  sdoc: SourceDocumentRead;
  adoc: AnnotationDocumentRead;
}

// todo: refactor this when applying react bulletproof architecture
const keyFactory = {
  all: ["visibleAdocSpan"] as const,
  visible: (ids: number[]) => [...keyFactory.all, ids] as const,
};

function TextAnnotator({ sdoc, adoc }: AnnotatorRemasteredProps) {
  // local state
  const codeSelectorRef = useRef<CodeSelectorHandle>(null);

  // global client state (redux)
  const visibleAdocIds = useAppSelector((state) => state.annotations.visibleAdocIds);
  const selectedCodeId = useAppSelector((state) => state.annotations.selectedCodeId);

  // global server state (react query)
  const tokens = SdocHooks.useGetDocumentTokens(sdoc.id);
  const annotations = useQuery<
    SpanAnnotationReadResolved[],
    Error,
    SpanAnnotationReadResolved[],
    ReturnType<typeof keyFactory["visible"]>
  >(keyFactory.visible(visibleAdocIds), async ({ queryKey }) => {
    const ids = queryKey[1];
    const queries = ids.map(
      (adocId) =>
        AnnotationDocumentService.getAllSpanAnnotationsAdocAdocIdSpanAnnotationsGet({
          adocId: adocId,
          resolve: true,
        }) as Promise<SpanAnnotationReadResolved[]>
    );
    const annotations = await Promise.all(queries);
    return annotations.flat();
  });

  // mutations for create, update, delete
  const queryClient = useQueryClient();
  const showErrorSnackbar = (error: Error) => {
    SnackbarAPI.openSnackbar({
      text: error.message,
      severity: "error",
    });
  };
  const createMutation = SpanAnnotationHooks.useCreateAnnotation({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Created Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async (newSpanAnnotation) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(keyFactory.visible(visibleAdocIds));

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(keyFactory.visible(visibleAdocIds));

      // Optimistically update to the new value
      queryClient.setQueryData(keyFactory.visible(visibleAdocIds), (old: SpanAnnotationReadResolved[] | undefined) => {
        const bbox = {
          ...newSpanAnnotation.requestBody,
          id: -1,
          code: {
            name: "",
            color: "",
            description: "",
            id: newSpanAnnotation.requestBody.current_code_id,
            project_id: 0,
            user_id: 0,
            created: "",
            updated: "",
          },
          created: "",
          updated: "",
        };
        return old === undefined ? [bbox] : [...old, bbox];
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: keyFactory.visible(visibleAdocIds) };
    },
    onError: (error: Error, newBbox, context: any) => {
      showErrorSnackbar(error);
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });
  const updateMutation = SpanAnnotationHooks.useUpdateSpan({
    onSuccess: (data) => {
      SnackbarAPI.openSnackbar({
        text: `Updated Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic update
    // todo: this is not working yet, because optimistic update only updates the bbox annotation, not the list of bbox annotations
    onMutate: async (newSpanAnnotation) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId]);

      // Snapshot the previous value
      const previousBbox = queryClient.getQueryData([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId],
        (old: SpanAnnotationReadResolved | undefined) => {
          if (old === undefined) {
            return undefined;
          }
          return {
            ...old,
            code: {
              name: "",
              color: "",
              description: "",
              id: newSpanAnnotation.requestBody.current_code_id,
              project_id: 0,
              user_id: 0,
              created: "",
              updated: "",
            },
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousBbox };
    },
    onError: (error: Error, newSpanAnnotation, context: any) => {
      showErrorSnackbar(error);
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.spanId], context.previousBbox);
    },
    // Always re-fetch after error or success:
    onSettled: (newSpanAnnotation, error, variables, context: any) => {
      if (newSpanAnnotation) {
        queryClient.invalidateQueries([QueryKey.SPAN_ANNOTATION, newSpanAnnotation.id]);
      }
      queryClient.invalidateQueries(keyFactory.all); // todo: this should not be necessary, as the list does actually not change on update. Change the rendering.
    },
  });
  const deleteMutation = SpanAnnotationHooks.useDeleteSpan({
    onSuccess: (data) => {
      queryClient.invalidateQueries(keyFactory.all); //todo: not all, but update all queries that contain the affected adoc! (check docs if this is possible)
      SnackbarAPI.openSnackbar({
        text: `Deleted Span Annotation ${data.id}`,
        severity: "success",
      });
    },
    // optimistic updates
    onMutate: async ({ spanId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(keyFactory.visible(visibleAdocIds));

      // Snapshot the previous value
      const previousSpanAnnotations = queryClient.getQueryData(keyFactory.visible(visibleAdocIds));

      // Optimistically update to the new value
      queryClient.setQueryData(keyFactory.visible(visibleAdocIds), (old: SpanAnnotationReadResolved[] | undefined) => {
        if (old === undefined) {
          return undefined;
        }

        return old.filter((spanAnnotation) => spanAnnotation.id !== spanId);
      });

      // Return a context object with the snapshotted value
      return { previousSpanAnnotations, myCustomQueryKey: keyFactory.visible(visibleAdocIds) };
    },
    onError: (error: Error, newBbox, context: any) => {
      showErrorSnackbar(error);
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(context.myCustomQueryKey, context.previousSpanAnnotations);
    },
    // Always re-fetch after error or success:
    onSettled: (data, error, variables, context: any) => {
      queryClient.invalidateQueries(context.myCustomQueryKey);
    },
  });

  // computed
  // todo: maybe implement with selector?
  const tokenData: IToken[] | undefined = useMemo(() => {
    if (!tokens.data) return undefined;
    if (!tokens.data.token_character_offsets) return undefined;

    const offsets = tokens.data.token_character_offsets;
    const texts = tokens.data.tokens;
    console.time("tokenData");
    const result = texts.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
    console.timeEnd("tokenData");
    return result;
  }, [tokens.data]);

  // todo: maybe implement with selector?
  // this map stores annotationId -> SpanAnnotationReadResolved
  const annotationMap = useMemo(() => {
    if (!annotations.data) return undefined;

    console.time("annotationMap");
    const result = new Map<number, SpanAnnotationReadResolved>();
    annotations.data.forEach((a) => result.set(a.id, a));
    console.timeEnd("annotationMap");
    return result;
  }, [annotations.data]);

  // this map stores tokenId -> spanAnnotationId[]
  const annotationsPerToken = useMemo(() => {
    if (!annotations.data) return undefined;

    console.time("annotationsPerToken");
    const result = new Map<number, number[]>();
    annotations.data.forEach((annotation) => {
      for (let i = annotation.begin_token; i <= annotation.end_token - 1; i++) {
        const tokenAnnotations = result.get(i) || [];
        tokenAnnotations.push(annotation.id);
        result.set(i, tokenAnnotations);
      }
    });
    console.timeEnd("annotationsPerToken");
    return result;
  }, [annotations.data]);

  // handle ui events
  const handleContextMenu = (event: React.MouseEvent) => {
    if (!annotationsPerToken) return;
    if (!annotationMap) return;

    const target = event.target as HTMLElement;
    if (target.className === "tok" && target.childElementCount > 0) {
      event.preventDefault();

      // get all annotations that span this token
      const tokenIndex = parseInt(target.getAttribute("data-tokenid")!);
      const annos = annotationsPerToken.get(tokenIndex);

      // open code selector if there are annotations
      if (annos) {
        // calculate position of the code selector (based on selection end)
        const boundingBox = target.getBoundingClientRect();
        const position = {
          left: boundingBox.left,
          top: boundingBox.top + boundingBox.height,
        };

        // open code selector
        codeSelectorRef.current!.open(
          position,
          annos.map((a) => annotationMap.get(a)!)
        );
      }
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 2) return;
    if (!tokenData) return;

    // make sure that selection is valid
    const selection = window.getSelection();
    if (!selection || selectionIsEmpty(selection)) return;

    // make sure a code is selected (in the Code Explorer)
    if (!selectedCodeId) {
      SnackbarAPI.openSnackbar({
        text: `Please select a Code in the Code Explorer`,
        severity: "error",
      });
      return;
    }

    // get the selected begin and end token
    const selectionStart = selection?.anchorNode?.parentElement?.getAttribute("data-tokenid");
    const selectionEnd = selection?.focusNode?.parentElement?.getAttribute("data-tokenid");
    if (!selectionStart || !selectionEnd) return;

    // create annotation
    const begin = parseInt(selectionStart);
    const end = parseInt(selectionEnd);

    // swap begin and end if necessary (left to right, right to left annotation)
    const begin_token = end < begin ? end : begin;
    const end_token = end < begin ? begin : end;

    const span_text = tokenData
      .slice(begin_token, end_token + 1)
      .map((t) => t.text)
      .join(" ");

    const requestBody = {
      current_code_id: selectedCodeId,
      annotation_document_id: adoc.id,
      begin: tokenData[begin_token].beginChar,
      end: tokenData[end_token].endChar,
      begin_token: begin_token,
      end_token: end_token + 1,
      span_text: span_text,
    };
    createMutation.mutate({ requestBody });

    // clear selection
    selection.empty();
  };

  // handle code selector events
  const handleCodeSelectorDeleteAnnotation = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode
  ) => {
    deleteMutation.mutate({ spanId: annotation.id });
  };
  const handleCodeSelectorEditCode = (
    annotation: SpanAnnotationReadResolved | BBoxAnnotationReadResolvedCode,
    code: ICode
  ) => {
    updateMutation.mutate({
      spanId: annotation.id,
      requestBody: {
        current_code_id: code.id,
      },
    });
  };

  const renderedTokens = useMemo(() => {
    if (!annotationsPerToken || !tokenData || !annotationMap) {
      return <div>Loading...</div>;
    }

    console.time("renderTokens");
    const result = (
      <>
        {tokenData.map((token) => (
          <Token
            key={`${sdoc.id}-${token.index}`}
            token={token}
            spanAnnotations={(annotationsPerToken.get(token.index) || []).map(
              (annotationId) => annotationMap.get(annotationId)!
            )}
          />
        ))}
      </>
    );
    console.timeEnd("renderTokens");
    return result;
  }, [annotationsPerToken, tokenData, annotationMap]);

  return (
    <div
      className="myFlexFillAllContainer"
      style={{ lineHeight: "26px" }}
      onContextMenu={handleContextMenu}
      onMouseUp={handleMouseUp}
    >
      <CodeContextMenu
        ref={codeSelectorRef}
        onEdit={handleCodeSelectorEditCode}
        onDelete={handleCodeSelectorDeleteAnnotation}
      />
      {renderedTokens}
    </div>
  );
}

export default TextAnnotator;
