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
      const index = state.checkBoxes.findIndex((item) => item === action.payload);
      if (index !== -1) {
        state.checkBoxes.splice(index, 1);
        state.isChecked = false;
      } else {
        state.checkBoxes.push(action.payload);
        state.isChecked = true;
      }
    },
  },
});

export const CheckBoxActions = checkBoxSlice.actions;
export default checkBoxSlice.reducer;
