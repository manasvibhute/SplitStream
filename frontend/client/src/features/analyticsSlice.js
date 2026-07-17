import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../lib/api";

export const fetchAnalytics = createAsyncThunk("analytics/fetch", async (filters = {}, { getState }) => {
  const params = new URLSearchParams();
  if (filters.groupId) params.set("groupId", filters.groupId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/analytics${query}`, { token: getState().auth.accessToken });
});

const analyticsSlice = createSlice({
  name: "analytics",
  initialState: {
    data: null,
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalytics.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.status = "idle";
        state.data = action.payload;
      })
      .addCase(fetchAnalytics.rejected, (state, action) => {
        state.status = "idle";
        state.error = action.error.message;
      });
  },
});

export default analyticsSlice.reducer;
