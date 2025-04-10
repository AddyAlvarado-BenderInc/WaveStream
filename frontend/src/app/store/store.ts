import { configureStore } from '@reduxjs/toolkit';
import productManagerReducer from './productManagerSlice';
import { variableReducer } from './productManagerSlice';
import { typeTaskReducer } from './productManagerSlice';
import { parameterReducer } from './productManagerSlice';

export const store = configureStore({
    reducer: {
        productManager: productManagerReducer,
        variables: variableReducer,
        typeTask: typeTaskReducer,
        parameter: parameterReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;