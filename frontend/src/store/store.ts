import { configureStore } from '@reduxjs/toolkit';
import variableReducer  from './slice';
import typeTaskReducer from './slice';
import { parameterReducer } from './slice';
import { sheetDataReducer } from './slice';

export const store = configureStore({
    reducer: {
        variables: variableReducer,
        task: typeTaskReducer,
        parameter: parameterReducer,
        sheetData: sheetDataReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store;