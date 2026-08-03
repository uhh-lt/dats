import { QueryKey } from "@api/hooks/QueryKey";
import { MemoIndicator } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { useQueryClient } from "@tanstack/react-query";

interface SdocMemoIndicatorProps {
  sdocId: number;
}

/**
 * Renders a memo indicator for a source document, reading the memo ids
 * from the seeded SDOC_MEMOS query cache (populated by document search).
 * Renders nothing if the document has no memos.
 */
export function SdocMemoIndicator({ sdocId }: SdocMemoIndicatorProps) {
  const queryClient = useQueryClient();
  const memoIds = queryClient.getQueryData<number[]>([QueryKey.SDOC_MEMOS, sdocId]);

  return (
    <MemoIndicator
      memoIds={memoIds !== undefined ? memoIds : []}
      attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT}
      attachedObjectId={sdocId}
    />
  );
}
