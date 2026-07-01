import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../lib/api";
import { disconnectSocket } from "../lib/socket";

const savedAuth = JSON.parse(localStorage.getItem("splitstream-auth") || "null");

export const signup = createAsyncThunk("auth/signup", async (payload) =>
  apiRequest("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) })
);

export const login = createAsyncThunk("auth/login", async (payload) =>
  apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(payload) })
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedAuth?.user || null,
    accessToken: savedAuth?.accessToken || null,
    refreshToken: savedAuth?.refreshToken || null,
    status: "idle",
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem("splitstream-auth");
      disconnectSocket();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signup.fulfilled, saveAuth)
      .addCase(login.fulfilled, saveAuth)
      .addCase(signup.rejected, saveError)
      .addCase(login.rejected, saveError);
  },
});

function saveAuth(state, action) {
  state.status = "idle";
  state.user = action.payload.user;
  state.accessToken = action.payload.accessToken;
  state.refreshToken = action.payload.refreshToken;
  localStorage.setItem("splitstream-auth", JSON.stringify(action.payload));
}

function saveError(state, action) {
  state.status = "idle";
  state.error = action.error.message;
}

export const { logout } = authSlice.actions;
export default authSlice.reducer;
