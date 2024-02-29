export const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
};
