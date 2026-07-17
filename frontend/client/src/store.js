import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/authSlice";
import groupsReducer from "./features/groupsSlice";
import analyticsReducer from "./features/analyticsSlice";
import toastReducer from "./features/toastSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupsReducer,
    analytics: analyticsReducer,
    toast: toastReducer,
  },
});
