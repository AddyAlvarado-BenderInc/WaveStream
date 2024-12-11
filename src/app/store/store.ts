import { configureStore } from '@reduxjs/toolkit';
import productManagerReducer from '../slices/productManagerSlice';

export const store = configureStore({
    reducer: {
        productManager: productManagerReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
