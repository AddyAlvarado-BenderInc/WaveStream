import React, { useState, useEffect } from "react";
import styles from './component.module.css';

interface AdvancedDescriptionProps {
    description: string;
    initialReactJS: string;
    initialCSS: string;
    onCombine: (reactString: string, cssString: string) => void;
    onUpdate: (field: string, value: string) => void;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({
    description,
    initialReactJS,
    initialCSS,
    onCombine,
    onUpdate
}) => {
    const [activeTab, setActiveTab] = useState<"ReactJS" | "CSS">("ReactJS");
    const [reactJS, setReactJS] = useState(initialReactJS);
    const [css, setCss] = useState(initialCSS);

    useEffect(() => {
        setReactJS(initialReactJS);
    }, [initialReactJS]);
    
    useEffect(() => {
        setCss(initialCSS);
    }, [initialCSS]);
    

    const handleCombine = () => {
        onCombine(reactJS, css);
    };

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                <button
                    className={activeTab === "ReactJS" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("ReactJS")}
                >
                    ReactJS
                </button>
                <button
                    className={activeTab === "CSS" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("CSS")}
                >
                    CSS
                </button>
            </div>
            <div className={styles.editor}>
                {activeTab === "ReactJS" && (
                    <textarea
                        className={styles.textarea}
                        value={reactJS}
                        onChange={(e) => {
                            const value = e.target.value;
                            setReactJS(value);
                            onUpdate("reactJS", value);
                        }}
                        placeholder="Write ReactJS code here..."
                    />
                )}
                {activeTab === "CSS" && (
                    <textarea
                        className={styles.textarea}
                        value={css}
                        onChange={(e) => {
                            const value = e.target.value;
                            setCss(value);
                            onUpdate("css", value);
                        }}
                        placeholder="Write CSS here..."
                    />
                )}
            </div>
            <button className={styles.combineButton} onClick={handleCombine}>
                Combine ReactJS and CSS
            </button>
        </div>
    );
};

export default AdvancedDescription;
