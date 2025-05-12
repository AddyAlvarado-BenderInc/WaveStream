import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { ProductManager, variableClassArray, variablePackageArray } from '../../../types/productManager';

interface ProductManagerState {
  productManagers: ProductManager[];
}

const initialManagerState: ProductManagerState = {
  productManagers: [],
};

interface IconManagerState {
  icon: Array<{
    filename: string;
    url: string;
  }[]>;
}

interface PDFManagerState {
  pdf: Array<{
    filename: string;
    url: string;
  }[]>;
}

const initialPDFManagerState: PDFManagerState = {
  pdf: [],
};

const initialIconManagerState: IconManagerState = {
  icon: [],
};

interface VariableState {
  variableClassArray: Array<{
    dataId: number;
    name: string;
    dataLength: number;
    variableData: Record<string, {
      dataId: number;
      value: string;
    } | null>;
  } | null | undefined>
  variableIconPackage: Array<{
    dataId: number;
    name: string;
    dataLength: number;
    variableData: Record<string, {
        dataId: number;
        value: {
            filename: string[];
            url: string[];
        };
    } | null>;
}>;
  variableClass: Record<string, any> | null;
  stringInput: string;
  textareaInput: string;
  integerInput: string;
}

interface VariableClass {
  dataId: number;
  name: string;
  dataLength: number;
  variableData: Record<string, {
    dataId: number;
    value: string;
  } | null>;
}

interface VariableIconPackage {
  dataId: number;
  name: string;
  dataLength: number;
  variableData: Record<string, {
      dataId: number;
      value: {
          filename: string[];
          url: string[];
      };
  } | null>;
}

type VariableClassArrayPayload = Array<variableClassArray | null | undefined>;
type VariablePackageArrayPayload = Array<variablePackageArray | null | undefined>;

type VariableClassState = Array<VariableClass>;
type VariablePackageState = Array<VariableIconPackage>;

const initialState: VariableState = {
  variableIconPackage: [],
  variableClassArray: [],
  variableClass: null,
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

interface ParameterItems {
  id: number;
  variable: string;
  parameterName: string;
  addedParameter: string;
}

interface ParameterState {
  parameters: Array<ParameterItems>;
  parameterBundle: Record<string, any> | null;
}

const initialParameterState: ParameterState = {
  parameters: [],
  parameterBundle: null
};

interface AutomationState {
  runOption: string;
  serverOption: string;
  isRunning: boolean;
}

const initialAutomationState: AutomationState = {
  runOption: "",
  serverOption: "",
  isRunning: false,
};

const iconManagerSlice = createSlice({
  name: 'iconManager',
  initialState: initialIconManagerState,
  reducers: {
    setIcon: (state, action: PayloadAction<IconManagerState['icon']>) => {
      state.icon = action.payload;
    },
    addIcon: (state, action: PayloadAction<{ filename: string; url: string }[]>) => {
      state.icon.push(action.payload);
    },
    deleteIcon: (state, action: PayloadAction<string>) => {
      state.icon = state.icon.map((iconArray) =>
        iconArray.filter((item) => item.filename !== action.payload)
      );
    },
    clearIcon: (state) => {
      state.icon = [];
    },
  },
});

const pdfManagerSlice = createSlice({
  name: 'pdfManager',
  initialState: initialPDFManagerState,
  reducers: {
    setPDF: (state, action: PayloadAction<PDFManagerState['pdf']>) => {
      state.pdf = action.payload;
    },
    addPDF: (state, action: PayloadAction<{ filename: string; url: string }[]>) => {
      state.pdf.push(action.payload);
    },
    deletePDF: (state, action: PayloadAction<string>) => {
      state.pdf = state.pdf.map((pdfArray) =>
        pdfArray.filter((item) => item.filename !== action.payload)
      );
    },
    clearPDF: (state) => {
      state.pdf = [];
    },
  },
})

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
    addVariablePackage: (state, action: PayloadAction<VariableIconPackage>) => {
      state.variableIconPackage.push(action.payload);
    },
    clearAllVariablePackage: (state) => {
      state.variableIconPackage = [];
    },
    deleteVariablePackage: (state, action: PayloadAction<number | null | undefined>) => {
      state.variableIconPackage = state.variableIconPackage.filter((id) => id?.dataId !== action.payload);
    },
    addVariableClassArray: (state, action: PayloadAction<VariableClass>) => {
      state.variableClassArray.push(action.payload);
    },
    clearAllVariableClassArray: (state) => {
      state.variableClassArray = [];
    },
    deleteVariableClassArray: (state, action: PayloadAction<number | null | undefined>) => {
      state.variableClassArray = state.variableClassArray.filter((id) => id?.dataId !== action.payload);
    },
    setVariableClassArray: (state, action: PayloadAction<VariableClassArrayPayload | undefined>) => {
      try {
        if (!Array.isArray(action.payload)) {
          console.warn("setVariableClassArray received non-array payload, setting state to empty array:", action.payload);
          state.variableClassArray = [];
          return;
        }

        const filteredPayload = action.payload.filter(
          (item): item is variableClassArray => item !== null && item !== undefined
        );
        state.variableClassArray = filteredPayload as VariableClassState;

      } catch (e) {
        console.error("Error processing setVariableClassArray payload:", action.payload, e);
        toast.error("Failed to update variable class data due to internal error.");
        state.variableClassArray = []; 
      }
    },

    setVariablePackageArray: (state, action: PayloadAction<VariablePackageArrayPayload | undefined>) => {
      try {
        if (!Array.isArray(action.payload)) {
          console.warn("setVariablePackageArray received non-array payload, setting state to empty array:", action.payload);
          state.variableIconPackage = [];
          return;
        }
        const filteredPayload = action.payload.filter(
          (item): item is variablePackageArray => item !== null && item !== undefined
        );
        state.variableIconPackage = filteredPayload as VariablePackageState;

      } catch (e) {
        console.error("Error processing setVariablePackageArray payload:", action.payload, e);
        toast.error("Failed to update variable package data due to internal error.");
        state.variableIconPackage = [];
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
    addParameter: (state, action: PayloadAction<ParameterItems>) => {
      state.parameters.push(action.payload);
    },
    setParameterBundle: (state, action: PayloadAction<Record<string, any> | null>) => {
      state.parameterBundle = action.payload;
    },
    clearAllParameters: (state) => {
      state.parameters = [];
      console.log("Cleared all parameters from Redux store.");
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

const automationSlice = createSlice({
  name: "automation",
  initialState: initialAutomationState,
  reducers: {
    setRunOption: (state, action: PayloadAction<string>) => {
      state.runOption = action.payload;
    },
    setServerOption: (state, action: PayloadAction<string>) => {
      state.serverOption = action.payload;
    },
    setIsRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },
    clearAllRunOptions: (state) => {
      state.runOption = "";
      state.serverOption = "";
      state.isRunning = false;
    }
  },
})

export const {
  addVariablePackage,
  deleteVariablePackage,
  clearAllVariablePackage,
  addVariableClassArray,
  clearAllVariableClassArray,
  deleteVariableClassArray,
  setVariableClass,
  setStringInput,
  setTextareaInput,
  setIntegerInput,
  clearAllInputs,
  setVariableClassArray,
  setVariablePackageArray,
} = variableSlice.actions;

export const { setTaskName, setTaskType } = typeTaskSlice.actions;
export const { addParameter, setParameterBundle, clearAllParameters } = parameterSlice.actions;
export const clearParameter = createAction<number | undefined>('parameters/clear');
export const { updateProductManager } = productManagerSlice.actions;
export const { setIcon, addIcon, clearIcon, deleteIcon } = iconManagerSlice.actions;
export const { setPDF, addPDF, clearPDF, deletePDF } = pdfManagerSlice.actions;
export const { setRunOption, setServerOption, setIsRunning, clearAllRunOptions } = automationSlice.actions;

export default productManagerSlice.reducer;
export const variableReducer = variableSlice.reducer;
export const typeTaskReducer = typeTaskSlice.reducer;
export const parameterReducer = parameterSlice.reducer;
export const iconManagerReducer = iconManagerSlice.reducer;
export const pdfManagerReducer = pdfManagerSlice.reducer;
export const automationReducer = automationSlice.reducer;