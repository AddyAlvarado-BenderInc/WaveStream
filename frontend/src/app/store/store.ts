import { configureStore } from '@reduxjs/toolkit';
import productManagerReducer from './productManagerSlice';
import { variableReducer } from './productManagerSlice';
import { typeTaskReducer } from './productManagerSlice';
import { parameterReducer } from './productManagerSlice';
import { iconManagerReducer } from './productManagerSlice';
import { pdfManagerReducer } from './productManagerSlice';
import { automationReducer } from './productManagerSlice';
import { systemLoggerReducer } from './productManagerSlice';

export const store = configureStore({
    reducer: {
        productManager: productManagerReducer,
        variables: variableReducer,
        typeTask: typeTaskReducer,
        parameter: parameterReducer,
        iconManager: iconManagerReducer,
        pdfManager: pdfManagerReducer,
        automation: automationReducer,
        systemLogger: systemLoggerReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;