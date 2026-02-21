import { createFileRoute } from "@tanstack/react-router";
import { CodeMap } from "../../../../../api/CodeHooks.ts";
import { BBoxAnnotationRead } from "../../../../../api/openapi/models/BBoxAnnotationRead.ts";
import { MemoRead } from "../../../../../api/openapi/models/MemoRead.ts";
import { SentenceAnnotationRead } from "../../../../../api/openapi/models/SentenceAnnotationRead.ts";
import { SourceDocumentRead } from "../../../../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationRead } from "../../../../../api/openapi/models/SpanAnnotationRead.ts";
import { TagRead } from "../../../../../api/openapi/models/TagRead.ts";
import { WhiteboardService } from "../../../../../api/openapi/services/WhiteboardService.ts";
import { QueryKey } from "../../../../../api/QueryKey.ts";
import Whiteboard from "../../../../../features/whiteboard/Whiteboard.tsx";
import queryClient from "../../../../../plugins/ReactQueryClient.ts";

export const Route = createFileRoute("/_auth/project/$projectId/whiteboard/$whiteboardId")({
  params: {
    parse: ({ whiteboardId }) => ({ whiteboardId: parseInt(whiteboardId) }),
  },
  component: Whiteboard,
  loader: async ({ params }) => {
    const whiteboardData = await WhiteboardService.getDataById({ whiteboardId: params.whiteboardId });
    whiteboardData.span_annotations.forEach((sa) => {
      queryClient.setQueryData<SpanAnnotationRead>([QueryKey.SPAN_ANNOTATION, sa.id], sa);
    });
    whiteboardData.sent_annotations.forEach((sa) => {
      queryClient.setQueryData<SentenceAnnotationRead>([QueryKey.SENTENCE_ANNOTATION, sa.id], sa);
    });
    whiteboardData.bbox_annotations.forEach((ba) => {
      queryClient.setQueryData<BBoxAnnotationRead>([QueryKey.BBOX_ANNOTATION, ba.id], ba);
    });
    whiteboardData.memos.forEach((memo) => {
      queryClient.setQueryData<MemoRead>([QueryKey.MEMO, memo.id], memo);
    });
    whiteboardData.sdocs.forEach((sdoc) => {
      queryClient.setQueryData<SourceDocumentRead>([QueryKey.SDOC, sdoc.id], sdoc);
    });

    if (whiteboardData.codes.length > 0) {
      const codeMap = whiteboardData.codes.reduce((acc, code) => {
        acc[code.id] = code;
        return acc;
      }, {} as CodeMap);
      queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, params.projectId], codeMap);
    }

    if (whiteboardData.tags.length > 0) {
      queryClient.setQueryData<TagRead[]>([QueryKey.PROJECT_TAGS, params.projectId], whiteboardData.tags);
    }

    return null;
  },
});
