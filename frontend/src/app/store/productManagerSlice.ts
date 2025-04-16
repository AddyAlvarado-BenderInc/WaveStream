import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { ProductManager } from '../../../types/productManager';

interface ProductManagerState {
  productManagers: ProductManager[];
}

const initialManagerState: ProductManagerState = {
  productManagers: [],
};

interface VariableState {
  variableClassArray: Array<{
    variableData: string[],
  }>
  variableClass: Object;
  stringInput: string;
  textareaInput: string;
  integerInput: string;
}

interface VariableClass {
  name: string;
  index: number;
  variableData: string[];
}

const initialState: VariableState = {
  variableClassArray: [],
  variableClass: Object,
  stringInput: "",
  textareaInput: "",
  integerInput: "",
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
  parameterBundle: Object;
}

const initialParameterState: ParameterState = {
  parameters: [],
  parameterBundle: Object
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
    addVariableClassArray: (state, action: PayloadAction<VariableClass>) => {
      state.variableClassArray.push(action.payload);
    },
    clearAllVariableClassArray: (state) => {
      state.variableClassArray = [];
    },
    deleteVariableClassArray: (state, action: PayloadAction<number>) => {
      state.variableClassArray = state.variableClassArray.filter((_, index) => index !== action.payload);
    },
    updateVariableClassArray: (state, action: PayloadAction<VariableClass>) => {
      const { index, variableData } = action.payload;
      if (state.variableClassArray[index]) {
        state.variableClassArray[index].variableData = variableData;
      }
    },
    setVariableClass: (state, action: PayloadAction<Object>) => {
      state.variableClass = action.payload;
    },
    setStringInput: (state, action: PayloadAction<string>) => {
      state.stringInput = action.payload;
    },
    setTextareaInput: (state, action: PayloadAction<string>) => {
      state.textareaInput = action.payload;
    },
    setIntegerInput: (state, action: PayloadAction<string>) => {
      state.integerInput = action.payload;
    },
    clearAllInputs: (state) => {
      state.stringInput = "";
      state.textareaInput = "";
      state.integerInput = "";
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
    },
    setParameterBundle: (state, action: PayloadAction<{
      id: number;
      variable: string;
      parameterName: string;
      addedParameter: string;
    }[]>) => {
      state.parameterBundle = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearParameter, (state, action) => {
      state.parameters = state.parameters.filter(
        param => param.id !== action.payload
      );
    });
  },
});

export const {
  addVariableClassArray,
  clearAllVariableClassArray,
  deleteVariableClassArray,
  updateVariableClassArray,
  setVariableClass,
  setStringInput,
  setTextareaInput,
  setIntegerInput,
  clearAllInputs
} = variableSlice.actions;

export const { setTaskName, setTaskType } = typeTaskSlice.actions;
export const { addParameter, setParameterBundle } = parameterSlice.actions;
export const clearParameter = createAction<number | undefined>('parameters/clear');
export const { updateProductManager } = productManagerSlice.actions;

export default productManagerSlice.reducer;
export const variableReducer = variableSlice.reducer;
export const typeTaskReducer = typeTaskSlice.reducer;
export const parameterReducer = parameterSlice.reducer;