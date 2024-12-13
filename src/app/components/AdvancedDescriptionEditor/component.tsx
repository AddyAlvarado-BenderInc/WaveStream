import React from "react";

interface AdvancedDescriptionProps {
    description: string;
    section: string;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({ description }) => {
    return (
        <div>
            <h3>Advanced Description</h3>
            <input type="text" value={description} />
        </div>
    );
}

export default AdvancedDescription;