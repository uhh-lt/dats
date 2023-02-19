import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CheckBoxState {
  checkBoxes: any[];
  isChecked: boolean;
}

const initialState: CheckBoxState = {
  checkBoxes: [],
  isChecked: false,
};

export const checkBoxSlice = createSlice({
  name: "checkBoxs",
  initialState,
  reducers: {
    toggleCheckBox: (state, action: PayloadAction<any>) => {
      const index =
        typeof action.payload === "number"
          ? action.payload
          : state.checkBoxes.findIndex((item) => item.code.id === action.payload.code.id);
      let newState = {
        ...state,
        isChecked: false,
        checkBoxes: [...state.checkBoxes],
      };
      if (index !== -1) {
        newState.checkBoxes.splice(index, 1);
      } else {
        newState.checkBoxes.push(action.payload);
      }
      if (newState.checkBoxes.length > 0) {
        newState.isChecked = true;
      }
      return newState;
    },
  },
});

export const CheckBoxActions = checkBoxSlice.actions;
export default checkBoxSlice.reducer;
