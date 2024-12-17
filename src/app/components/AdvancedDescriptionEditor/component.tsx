import React, { useState, useEffect, useRef } from "react";
import styles from "./component.module.css";

interface AdvancedDescriptionProps {
    description: string;
    initialJS: string;
    initialHTML: string;
    initialCSS: string;
    onUpdate: (field: string, value: string) => void;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({
    description,
    initialJS,
    initialCSS,
    initialHTML,
    onUpdate,
}) => {
    const [activeTab, setActiveTab] = useState<"Javascript" | "CSS" | "HTML">("HTML");
    const [js, setJs] = useState(initialJS);
    const [css, setCss] = useState(initialCSS);
    const [html, setHtml] = useState(initialHTML);

    const renderEditor = () => {
        switch (activeTab) {
            case "Javascript":
                return (
                    <textarea
                        className={styles.textarea}
                        value={js}
                        onChange={(e) => {
                            const value = e.target.value;
                            setJs(value);
                            onUpdate("js", value);
                        }}
                        placeholder="Write Javascript code here..."
                    />
                );
            case "CSS":
                return (
                    <textarea
                        className={styles.textarea}
                        value={css}
                        onChange={(e) => {
                            const value = e.target.value;
                            setCss(value);
                            onUpdate("css", value);
                        }}
                        placeholder="Write CSS code here..."
                    />
                );
            case "HTML":
                return (
                    <textarea
                        className={styles.textarea}
                        value={html}
                        onChange={(e) => {
                            const value = e.target.value;
                            setHtml(value);
                            onUpdate("html", value);
                        }}
                        placeholder="Write HTML code here..."
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.tabs}>
                <button
                    className={activeTab === "HTML" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("HTML")}
                >
                    HTML
                </button>
                <button
                    className={activeTab === "CSS" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("CSS")}
                >
                    CSS
                </button>
                <button
                    className={activeTab === "Javascript" ? styles.activeTab : ""}
                    onClick={() => setActiveTab("Javascript")}
                >
                    JS
                </button>
            </div>
            <div className={styles.editor}>{renderEditor()}</div>
        </div>
    );
};

export default AdvancedDescription;
