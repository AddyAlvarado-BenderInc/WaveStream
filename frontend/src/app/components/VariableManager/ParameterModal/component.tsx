import React from 'react';
import './style.css';

interface ParameterModalProps {
    onSave: () => void;
    onCancel: () => void;
    parameterName: string;
    addedParameter: string;
    setLocalParameter: React.Dispatch<React.SetStateAction<{
        parameterName: string;
        addedParameter: string;
    }>>;
    intVarValue: string;
}

const ParameterModal: React.FC<ParameterModalProps> = ({onSave, onCancel, parameterName, addedParameter, setLocalParameter, intVarValue}) => {
    return (
        <div className="parameter-modal-overlay">
            <div className="parameter-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Add Parameter for {intVarValue}</h3>
                <div className="parameter-form">
                    <input
                        type="text"
                        placeholder="Parameter Name"
                        value={parameterName}
                        onChange={(e) => setLocalParameter(prev => ({
                            ...prev,
                            parameterName: e.target.value
                        }))}
                    />
                    <input
                        type="text"
                        placeholder="Parameter Value"
                        value={addedParameter}
                        onChange={(e) => setLocalParameter(prev => ({
                            ...prev,
                            addedParameter: e.target.value
                        }))}
                    />
                    <div className="parameter-modal-actions">
                        <button onClick={onSave}>Add Parameter</button>
                        <button onClick={onCancel}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ParameterModal;