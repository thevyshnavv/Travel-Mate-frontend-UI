import { createSlice } from '@reduxjs/toolkit';
import { authAPI } from '../services/api.js';

// Clean up legacy localStorage token if it exists
localStorage.removeItem('token');

const initialState = {
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  token: localStorage.getItem('user') ? 'cookie-stored-token' : null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token || 'cookie-stored-token';
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Register
    registerStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    registerSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token || 'cookie-stored-token';
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    registerFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear Auth State
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('user');
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  clearAuth,
  clearError,
} = authSlice.actions;

// Async thunk logout to clear cookie on backend
export const logout = () => async (dispatch) => {
  try {
    await authAPI.logout();
  } catch (err) {
    console.error('Server logout failed:', err);
  }
  dispatch(clearAuth());
};

export default authSlice.reducer;