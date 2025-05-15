# **Table Component Maintenance & Feature Roadmap**  

## **Goal**  
Ensure consistent data handling, prevent data shape mismatches, and maintain predictable rendering behavior for the `Table` component, particularly when dealing with complex data types like Packages.  

---

## **Phase 1: Planning & Understanding**  

1. **Define Scope**  
   - Clearly articulate the new feature or bug being fixed.  
   - Define the desired user experience and the data involved.  

2. **Identify Affected Components**  
   - `Table.tsx` (Data Consumer/Renderer)  
   - `WaveManager.tsx` (Primary State Holder, API Interaction, Hydration Logic)  
   - `VariableManager.tsx` (If it sends data *to* the Table)  
   - `productManagerSlice.ts` (Redux state, if global lists are affected)  
   - Backend API (If data fetching or saving format changes)  

3. **Analyze Data Flow**  
   - Where does the data originate? (API, User Input, Redux)  
   - Where is it stored? (Component State: `variableRowData`, `originalData`; Redux State)  
   - How is it passed? (Props, Callbacks, Redux Selectors)  
   - Where is it transformed?  

---

## **Phase 2: Data Shape Management (CRITICAL)**  
*This is the most crucial phase to prevent regressions.*  

1. **Define/Verify Types**  
   - **API/Redux Format:** Structure returned by the API and stored in Redux.  
   - **Table Internal Format:** Structure the `Table` component expects.  
   - **`variableRowData` Cell Format:** Structure of a single entry in `WaveManager`'s state.  
   - **API Save Format:** Structure expected by the backend when saving.  

2. **Centralize Transformations**  
   - Use `packageDataTransformer.ts` for all complex conversions.  
   - Apply `convertToTableFormat` when preparing data for `variableRowData` or the `Table`.  
   - Ensure consistent transformation logic across all relevant components.  

3. **Consistency is Key**  
   - The same transformation logic must be applied in all relevant places.  

---

## **Phase 3: Component Implementation**  

### **`WaveManager.tsx` (State Holder & Hydration)**  
- **Initial Load:**  
  - Fetch raw `productManager` data.  
  - Create `initialPackageDataMap` using `convertToTableFormat`.  
  - Initialize `variableRowData` with processed data.  

- **Post-Save Hydration:**  
  - Fetch `updatedProduct` data.  
  - Rebuild `packageDataMap` and update state accordingly.  

### **`VariableManager.tsx` (Data Injector)**  
- **`handleSendPackage`:**  
  - Convert selected package data using `convertToTableFormat`.  
  - Pass the converted object to `setVariableRowData`.  

### **`Table.tsx` (Renderer)**  
- Assume `value` is an `IGlobalVariablePackage` object.  
- Check `isPackage` and `typeof cellValue === 'object'`.  
- Parse and render package details safely with `try...catch`.  
- Provide fallback rendering for unexpected data.  

---

## **Phase 4: Saving & Persistence**  

### **`WaveManager.tsx` (`handleSave`)**  
- Prepare `formDataPayload` for `tableCellData`:  
  - Extract `dataId` from package objects.  
  - Convert to string before sending.  
- Ensure `globalVariablePackageData` matches backend expectations.  

### **Backend API**  
- Verify correct saving of package IDs and full package data.  
- Confirm response format (stringified vs. parsed `value`).  

---

## **Phase 5: Testing (Crucial)**  

1. **Transformation Logic**  
   - Unit test `convertToTableFormat` with various inputs.  

2. **Rendering**  
   - Test initial load, package addition, post-save rendering, and page reload.  

3. **Data Integrity**  
   - Inspect network payloads and responses.  
   - Check Redux DevTools for correct state updates.  

---

## **Phase 6: Documentation**  

1. **Type Definitions**  
   - Keep `types/productManager.ts` accurate.  

2. **Code Comments**  
   - Explain expected formats in `Table.tsx`.  
   - Document `convertToTableFormat` usage.  
   - Clarify save transformations in `handleSave`.  

3. **README/Wiki (Optional)**  
   - Summarize data flow and transformation importance.  

---

By following these steps—especially **Phase 2 (Data Shape Management)** and **Phase 5 (Testing)**—your team can maintain and enhance the `Table` component reliably.  