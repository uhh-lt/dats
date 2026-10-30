import { TriggerAdapter, TriggerItem, useAuiState } from "@assistant-ui/react";
import { CodeHooks } from "@core/code";
import { sdocQueries } from "@core/source-document";
import { TagHooks } from "@core/tag";
import { useDebounce } from "@hooks/useDebounce";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { LogicalOperator } from "@models/LogicalOperator";
import { SdocColumns } from "@models/SdocColumns";
import { StringOperator } from "@models/StringOperator";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const MAX_DOCUMENTS = 10;

const CATEGORIES = [
  { id: AttachedObjectType.SOURCE_DOCUMENT, label: "Documents" },
  { id: AttachedObjectType.CODE, label: "Codes" },
  { id: AttachedObjectType.TAG, label: "Tags" },
];

const matches = (item: TriggerItem, query: string) => item.label.toLowerCase().includes(query.toLowerCase());

/**
 * The @-mentions of the composer: the project's documents, codes and tags.
 * Codes and tags are loaded completely; documents are searched by name with
 * the text typed after the "@".
 */
export function useMentionAdapter() {
  const projectId = useAppSelector((state) => state.project.projectId);
  // the text after the last "@" at the end of the prompt, while a mention is typed
  const mentionQuery = useAuiState((state) => /@(\S*)$/.exec(state.composer.text)?.[1]);
  const documentQuery = useDebounce(mentionQuery ?? "", 300);

  const codes = CodeHooks.useGetAllCodes();
  const tags = TagHooks.useGetAllTags();
  const documents = useInfiniteQuery({
    ...sdocQueries.search({
      projectId: projectId ?? 0,
      searchQuery: "",
      expertMode: false,
      showFolders: false,
      pageSize: MAX_DOCUMENTS,
      requestBody: {
        filter: {
          id: "mention",
          logic_operator: LogicalOperator.AND,
          items: [
            {
              id: "mention-name",
              column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
              operator: StringOperator.STRING_CONTAINS,
              value: documentQuery,
            },
          ],
        },
        sorts: [],
      },
    }),
    enabled: projectId !== undefined && mentionQuery !== undefined,
  });

  const items = useMemo(() => {
    const firstPage = documents.data?.pages[0];
    const documentItems: TriggerItem[] = (firstPage?.hits ?? []).flatMap((hit) => {
      const sdoc = firstPage?.sdocs[hit.id];
      return sdoc
        ? [{ id: String(sdoc.id), type: AttachedObjectType.SOURCE_DOCUMENT, label: sdoc.name, description: "Document" }]
        : [];
    });
    const codeItems: TriggerItem[] = (codes.data ?? []).map((code) => ({
      id: String(code.id),
      type: AttachedObjectType.CODE,
      label: code.name,
      description: "Code",
    }));
    const tagItems: TriggerItem[] = (tags.data ?? []).map((tag) => ({
      id: String(tag.id),
      type: AttachedObjectType.TAG,
      label: tag.name,
      description: "Tag",
    }));
    return { documentItems, codeItems, tagItems };
  }, [documents.data, codes.data, tags.data]);

  const adapter: TriggerAdapter = useMemo(
    () => ({
      categories: () => CATEGORIES,
      categoryItems: (categoryId) => {
        if (categoryId === AttachedObjectType.SOURCE_DOCUMENT) return items.documentItems;
        if (categoryId === AttachedObjectType.CODE) return items.codeItems;
        if (categoryId === AttachedObjectType.TAG) return items.tagItems;
        return [];
      },
      // documents are already searched by the backend
      search: (query) => [
        ...items.documentItems,
        ...items.codeItems.filter((item) => matches(item, query)),
        ...items.tagItems.filter((item) => matches(item, query)),
      ],
    }),
    [items],
  );

  return { adapter, isLoading: documents.isFetching };
}
