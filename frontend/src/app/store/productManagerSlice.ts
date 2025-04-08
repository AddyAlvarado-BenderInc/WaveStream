import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';
import { ProductManager } from '../../../types/productManager';

interface ProductManagerState {
  productManagers: ProductManager[];
}

const initialManagerState: ProductManagerState = {
  productManagers: [],
};

interface VariableState {
  variableClass: Object;
  stringInput: string;
  textareaInput: string;
  integerInput: number;
}

const initialState: VariableState = {
  variableClass: Object,
  stringInput: "",
  textareaInput: "",
  integerInput: 0,
};

interface TaskState {
  taskName: string;
  taskType: string;
}

const initialTypeTask: TaskState = {
  taskName: "",
  taskType: "",
}

interface ParameterState {
  parameters: Array<{
    id: number;
    variable: string;
    parameterName: string;
    addedParameter: string;
  }>;
}

const initialParameterState: ParameterState = {
  parameters: [],
};

interface SheetDataState {
  classKeys: string[];
  columnNames: string[];
  columnData: string[];
}

const initialSheetDataState: SheetDataState = {
  classKeys: [],
  columnNames: [],
  columnData: [],
};

const productManagerSlice = createSlice({
  name: 'productManager',
  initialState: initialManagerState,
  reducers: {
    updateProductManager: (state, action: PayloadAction<ProductManager>) => {
      const index = state.productManagers.findIndex(pm => pm._id === action.payload._id);
      if (index !== -1) {
        state.productManagers[index] = action.payload;
      }
    },
  },
});

const variableSlice = createSlice({
  name: "variableMKS",
  initialState,
  reducers: {
    setVariableClass: (state, action: PayloadAction<Object>) => {
      console.log("Updating variable class to:", action.payload)
      state.variableClass = action.payload;
      // TODO: Will send this to the backend in the future
    },
    setStringInput: (state, action: PayloadAction<string>) => {
      console.log("Updating string input to:", action.payload)
      state.stringInput = action.payload;
    },
    setTextareaInput: (state, action: PayloadAction<string>) => {
      console.log("Updating textarea input to:", action.payload)
      state.textareaInput = action.payload;
    },
    setIntegerInput: (state, action: PayloadAction<number>) => {
      console.log("Updating integer input to:", action.payload)
      state.integerInput = action.payload;
    },
    clearAllInputs: (state) => {
      state.stringInput = "";
      state.textareaInput = "";
      state.integerInput = 0;
    },
  },
});

const typeTaskSlice = createSlice({
  name: "task",
  initialState: initialTypeTask,
  reducers: {
    setTaskName: (state, action: PayloadAction<string>) => {
      state.taskName = action.payload;
    },
    setTaskType: (state, action: PayloadAction<string>) => {
      state.taskType = action.payload;
    }
  },
});

const parameterSlice = createSlice({
  name: "parameter",
  initialState: initialParameterState,
  reducers: {
    addParameter: (state, action: PayloadAction<{
      id: number;
      variable: string;
      parameterName: string;
      addedParameter: string;
    }>) => {
      state.parameters.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(clearParameter, (state, action) => {
      state.parameters = state.parameters.filter(
        param => param.id !== action.payload
      );
    });
  },
});

const sheetDataSlice = createSlice({
  name: "sheetData",
  initialState: initialSheetDataState,
  reducers: {
    setClassKeys: (state, action: PayloadAction<string[]>) => {
      state.classKeys = action.payload;
    },
    setColumnNames: (state, action: PayloadAction<string[]>) => {
      state.columnNames = action.payload;
      state.columnData = action.payload;
    },
    setColumnData: (state, action: PayloadAction<string[]>) => {
      state.columnData = action.payload;
    },
  },
})
export const {
  setVariableClass,
  setStringInput,
  setTextareaInput,
  setIntegerInput,
  clearAllInputs
} = variableSlice.actions;

export const { setTaskName, setTaskType } = typeTaskSlice.actions;
export const { addParameter } = parameterSlice.actions;
export const clearParameter = createAction<number | undefined>('parameters/clear');
export const { setClassKeys, setColumnNames, setColumnData } = sheetDataSlice.actions;
export const { updateProductManager } = productManagerSlice.actions;

export default productManagerSlice.reducer;
export const variableReducer = variableSlice.reducer;
export const typeTaskReducer = typeTaskSlice.reducer;
export const parameterReducer = parameterSlice.reducer;
export const sheetDataReducer = sheetDataSlice.reducer;