import { createSlice } from '@reduxjs/toolkit';

interface ProductManagerState {
    productManagers: Array<any>;
    currentManager: any;
    loading: boolean;
}

const initialState: ProductManagerState = {
    productManagers: [],
    currentManager: null,
    loading: false,
};

const productManagerSlice = createSlice({
    name: 'productManager',
    initialState,
    reducers: {
        setManagers(state, action) {
            state.productManagers = action.payload;
        },
        setCurrentManager(state, action) {
            state.currentManager = action.payload;
        },
        setLoading(state, action) {
            state.loading = action.payload;
        },
    },
});

export const { setManagers, setCurrentManager, setLoading } = productManagerSlice.actions;
export default productManagerSlice.reducer;
