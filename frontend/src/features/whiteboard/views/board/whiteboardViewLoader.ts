import { CodeMap } from "@api/hooks/CodeHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { BBoxAnnotationRead } from "@api/models/BBoxAnnotationRead";
import { MemoRead } from "@api/models/MemoRead";
import { SentenceAnnotationRead } from "@api/models/SentenceAnnotationRead";
import { SourceDocumentRead } from "@api/models/SourceDocumentRead";
import { SpanAnnotationRead } from "@api/models/SpanAnnotationRead";
import { TagRead } from "@api/models/TagRead";
import { WhiteboardService } from "@api/services/WhiteboardService";
import { QueryClient } from "@tanstack/react-query";
import { projectWhiteboardsQueryOptions } from "../../_api/whiteboardQueryOptions";

interface WhiteboardViewLoaderArgs {
  queryClient: QueryClient;
  projectId: number;
  whiteboardId: number;
}

export async function whiteboardViewLoader({ queryClient, projectId, whiteboardId }: WhiteboardViewLoaderArgs) {
  const [whiteboardData] = await Promise.all([
    WhiteboardService.getDataById({ whiteboardId }),
    queryClient.ensureQueryData(projectWhiteboardsQueryOptions(projectId)),
  ]);

  // Pre-warm related entity caches so node components don't need to fetch individually
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
    queryClient.setQueryData<CodeMap>([QueryKey.PROJECT_CODES, projectId], codeMap);
  }

  if (whiteboardData.tags.length > 0) {
    queryClient.setQueryData<TagRead[]>([QueryKey.PROJECT_TAGS, projectId], whiteboardData.tags);
  }
}
