import { createSlice } from "@reduxjs/toolkit";

const toastSlice = createSlice({
  name: "toast",
  initialState: { message: null },
  reducers: {
    showToast(state, action) {
      state.message = action.payload;
    },
    clearToast(state) {
      state.message = null;
    },
  },
});

export const { showToast, clearToast } = toastSlice.actions;
export default toastSlice.reducer;
