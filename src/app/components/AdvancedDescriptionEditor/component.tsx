import React, { useState, useEffect, useRef } from "react";
import styles from "./component.module.css";

interface AdvancedDescriptionProps {
    description: string;
    initialJS: string;
    initialHTML: string;
    initialCSS: string;
    onUpdate: (field: string, value: string) => void;
    handleFieldSelect: (field: string) => void;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({
    description,
    initialJS,
    initialCSS,
    initialHTML,
    onUpdate,
    handleFieldSelect,
}) => {
    const [activeTab, setActiveTab] = useState<"Javascript" | "CSS" | "HTML">("HTML");
    const [js, setJs] = useState(initialJS);
    const [css, setCss] = useState(initialCSS);
    const [html, setHtml] = useState(initialHTML);

    const configIcon = "◉";

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const generateCombinedHTML = (): string => {
        return `
            <html>
                <head>
                    <style>${css}</style>
                </head>
                <body>
                    ${html}
                    <script>${js}<\/script>
                </body>
            </html>
        `;
    };

    const updateIframe = () => {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentDocument) {
            iframe.contentDocument.open();
            iframe.contentDocument.write(generateCombinedHTML());
            iframe.contentDocument.close();
        }
    };

    useEffect(() => {
        updateIframe();
        onUpdate(description, generateCombinedHTML());
    }, [html, css, js]);

    const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, updateState: (value: string) => void) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const textarea = e.currentTarget;
            const { selectionStart, selectionEnd, value } = textarea;

            const newValue = value.substring(0, selectionStart) + "\t" + value.substring(selectionEnd);
            updateState(newValue);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
            }, 0);
        }
    };

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
                        onKeyDown={(e) => handleTabKey(e, setJs)}
                        placeholder="Write JavaScript code here..."
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
                        onKeyDown={(e) => handleTabKey(e, setCss)}
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
                        onKeyDown={(e) => handleTabKey(e, setHtml)}
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
                <button
                    className={styles.iconButton}
                    onClick={() => handleFieldSelect("Advanced Description")}
                >{configIcon}</button>
            </div>
            <div className={styles.editor}>{renderEditor()}</div>
            <div className={styles.preview}>
                <iframe
                    ref={iframeRef}
                    title="Live Preview"
                    className={styles.previewFrame}
                />
            </div>
        </div>
    );
};

export default AdvancedDescription;
