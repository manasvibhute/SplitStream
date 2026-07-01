import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice";
import groupsReducer from "./features/groupsSlice";
import toastReducer from "./features/toastSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupsReducer,
    toast: toastReducer,
  },
});
