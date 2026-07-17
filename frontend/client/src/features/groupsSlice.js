import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../lib/api";

const withToken = (getState) => getState().auth.accessToken;

export const fetchGroups = createAsyncThunk("groups/fetchGroups", async (_, { getState }) =>
  apiRequest("/api/groups", { token: withToken(getState) })
);

export const createGroup = createAsyncThunk("groups/createGroup", async (name, { getState }) =>
  apiRequest("/api/groups", {
    method: "POST",
    token: withToken(getState),
    body: JSON.stringify({ name }),
  })
);

export const fetchGroup = createAsyncThunk("groups/fetchGroup", async (groupId, { getState }) =>
  apiRequest(`/api/groups/${groupId}`, { token: withToken(getState) })
);

export const addMember = createAsyncThunk("groups/addMember", async ({ groupId, email }, { getState }) =>
  apiRequest(`/api/groups/${groupId}/members`, {
    method: "POST",
    token: withToken(getState),
    body: JSON.stringify({ email }),
  })
);

export const addExpense = createAsyncThunk("groups/addExpense", async ({ groupId, expense }, { getState }) =>
  apiRequest(`/api/groups/${groupId}/expenses`, {
    method: "POST",
    token: withToken(getState),
    body: JSON.stringify(expense),
  })
);

export const deleteExpense = createAsyncThunk("groups/deleteExpense", async (expenseId, { getState }) =>
  apiRequest(`/api/expenses/${expenseId}`, {
    method: "DELETE",
    token: withToken(getState),
  })
);

export const settleUp = createAsyncThunk("groups/settleUp", async ({ groupId, settlement }, { getState }) =>
  apiRequest(`/api/groups/${groupId}/settle`, {
    method: "POST",
    token: withToken(getState),
    body: JSON.stringify(settlement),
  })
);

const groupsSlice = createSlice({
  name: "groups",
  initialState: {
    items: [],
    current: null,
    status: "idle",
    error: null,
  },
  reducers: {
    setCurrentFromSocket(state, action) {
      state.current = action.payload;
    },
    clearGroupError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(createGroup.fulfilled, (state) => {
        state.status = "idle";
      })
      .addMatcher(
        (action) => action.type.startsWith("groups/") && action.type.endsWith("/pending"),
        (state) => {
          state.status = "loading";
          state.error = null;
        }
      )
      .addMatcher(
        (action) =>
          [fetchGroup.fulfilled.type, addMember.fulfilled.type, addExpense.fulfilled.type, deleteExpense.fulfilled.type, settleUp.fulfilled.type].includes(
            action.type
          ),
        (state, action) => {
          state.status = "idle";
          state.current = action.payload;
        }
      )
      .addMatcher(
        (action) => action.type.startsWith("groups/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.status = "idle";
          state.error = action.error.message;
        }
      );
  },
});

export const { setCurrentFromSocket, clearGroupError } = groupsSlice.actions;
export default groupsSlice.reducer;
