export const selectionIsEmpty = (selection: Selection): boolean => {
  return selection.toString().trim().length === 0;
  // old code from fynn:
  // let position = selection.anchorNode!.compareDocumentPosition(selection.focusNode!);
  // return position === 0 && selection.focusOffset === selection.anchorOffset;
};
