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
    toggleCheckBox: (state, action: PayloadAction<any[]>) => {
      const newState = {
        ...state,
        isChecked: false,
        checkBoxes: action.payload,
      };
      if (newState.checkBoxes.length > 0) {
        newState.isChecked = true;
      }
      return newState;
    },
  },
});

export const CheckBoxActions = checkBoxSlice.actions;
export default checkBoxSlice.reducer;
