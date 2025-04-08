import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ProductManager } from '../../../types/productManager';

interface ProductManagerState {
  productManagers: ProductManager[];
}

const initialState: ProductManagerState = {
  productManagers: [],
};

  const productManagerSlice = createSlice({
    name: 'productManager',
    initialState,
    reducers: {
      updateProductManager: (state, action: PayloadAction<ProductManager>) => {
        const index = state.productManagers.findIndex(pm => pm._id === action.payload._id);
        if (index !== -1) {
          state.productManagers[index] = action.payload;
        }
      },
    },
  });

  export const { updateProductManager } = productManagerSlice.actions;
  
  export default productManagerSlice.reducer;