import { getIconComponent, Icon } from "@components/icons";
import { MyFilter, MyFilterExpression, createEmptyFilter } from "@core/filter";
import { WorkspaceTemplate } from "@core/workspace";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { AttachedObjectTypeOperator } from "@models/AttachedObjectTypeOperator";
import { BooleanOperator } from "@models/BooleanOperator";
import { IDOperator } from "@models/IDOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { MemoColumns } from "@models/MemoColumns";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { SortDirection } from "@models/SortDirection";
import { StringOperator } from "@models/StringOperator";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import UpdateIcon from "@mui/icons-material/Update";

export const memoDefaultFilterExpression: MyFilterExpression<MemoColumns> = {
  id: "memo-filter-expression",
  column: MemoColumns.M_TITLE,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

export const emptyMemoFilter = (): MyFilter<MemoColumns> => ({ ...createEmptyFilter(crypto.randomUUID()), items: [] });

const expressionFilter = (
  column: MemoColumns,
  operator: StringOperator | BooleanOperator | AttachedObjectTypeOperator | IDOperator,
  value: string | boolean | number,
): MyFilter<MemoColumns> => ({
  id: crypto.randomUUID(),
  logic_operator: LogicalOperator.AND,
  items: [{ id: crypto.randomUUID(), column, operator, value }],
});

const attachedTypeFilter = (type: AttachedObjectType): MyFilter<MemoColumns> =>
  expressionFilter(MemoColumns.M_ATTACHED_OBJECT_TYPE, AttachedObjectTypeOperator.ATTACHED_OBJECT_TYPE_EQUALS, type);

/** Create-view templates for the memo workspace. `userId` powers the "My Memos" template. */
export const createMemoTemplates = (userId: number): WorkspaceTemplate<MemoColumns>[] => [
  {
    icon: getIconComponent(Icon.MEMO, { fontSize: "small" }),
    label: "All memos",
    layout: SearchViewLayout.TABLE,
  },
  {
    icon: <AccountCircleIcon fontSize="small" />,
    label: "My Memos",
    layout: SearchViewLayout.LIST,
    filters: expressionFilter(MemoColumns.M_USER_ID, IDOperator.ID_EQUALS, userId),
  },
  {
    icon: <StarBorderIcon fontSize="small" />,
    label: "Favorite Memos",
    layout: SearchViewLayout.GALLERY,
    filters: expressionFilter(MemoColumns.M_FAVORITE, BooleanOperator.BOOLEAN_EQUALS, true),
  },
  {
    icon: <UpdateIcon fontSize="small" />,
    label: "Recent Memos",
    layout: SearchViewLayout.FEED,
    filters: emptyMemoFilter(),
    sorts: [{ column: MemoColumns.M_UPDATED, direction: SortDirection.DESC }],
  },
  {
    icon: getIconComponent(Icon.PROJECT, { fontSize: "small" }),
    label: "Project Memos",
    layout: SearchViewLayout.GALLERY,
    filters: attachedTypeFilter(AttachedObjectType.PROJECT),
  },
  {
    icon: getIconComponent(Icon.DOCUMENT, { fontSize: "small" }),
    label: "Document Memos",
    layout: SearchViewLayout.LIST,
    filters: attachedTypeFilter(AttachedObjectType.SOURCE_DOCUMENT),
  },
  {
    icon: getIconComponent(Icon.CODE, { fontSize: "small" }),
    label: "Code Memos",
    layout: SearchViewLayout.LIST,
    filters: attachedTypeFilter(AttachedObjectType.CODE),
  },
  {
    icon: getIconComponent(Icon.TAG, { fontSize: "small" }),
    label: "Tag Memos",
    layout: SearchViewLayout.LIST,
    filters: attachedTypeFilter(AttachedObjectType.TAG),
  },
  {
    icon: getIconComponent(Icon.SPAN_ANNOTATION, { fontSize: "small" }),
    label: "Span Memos",
    layout: SearchViewLayout.LIST,
    filters: attachedTypeFilter(AttachedObjectType.SPAN_ANNOTATION),
  },
  {
    icon: getIconComponent(Icon.BBOX_ANNOTATION, { fontSize: "small" }),
    label: "BBox Memos",
    layout: SearchViewLayout.LIST,
    filters: attachedTypeFilter(AttachedObjectType.BBOX_ANNOTATION),
  },
  {
    icon: getIconComponent(Icon.SENTENCE_ANNOTATION, { fontSize: "small" }),
    label: "Sentence Memos",
    layout: SearchViewLayout.LIST,
    filters: attachedTypeFilter(AttachedObjectType.SENTENCE_ANNOTATION),
  },
];
