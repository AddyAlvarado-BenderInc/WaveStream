import React, { useState, useEffect, useRef } from "react";
import styles from "./component.module.css";

interface AdvancedDescriptionProps {
    description: string;
    initialJS: string;
    initialHTML: string;
    initialCSS: string;
    onUpdate: (field: string, value: string) => void;
    handleFieldSelect: (field: string) => void;
    handleGlobalChange: (field: string) => void;
}

const AdvancedDescription: React.FC<AdvancedDescriptionProps> = ({
    description,
    initialJS,
    initialCSS,
    initialHTML,
    onUpdate,
    handleFieldSelect,
    handleGlobalChange
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

    const handleIconClick = (e: React.MouseEvent, field: string) => {
        e.stopPropagation();

        const camelCaseField = field
            .split(' ')
            .map((word, index) =>
                index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join('');

        handleFieldSelect(camelCaseField);
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
        const combinedHTML = generateCombinedHTML();
        onUpdate('description', combinedHTML);
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
                <select
                    value={""}
                    // onChange={handleGlobalChange}
                > {/* User generated descriptions, named by users for loading descriptions, will have a general description database for all saved descriptions for cross-site reuse */}
                    <option value={"placeholder-1"}>Welcome To...</option> {/* placeholders as an example */}
                    <option value={"placeholder-2"}>Basic Hospital Description</option>
                    <option value={"placeholder-3"}>Best Item On Market!</option>
                </select>
                <button
                    className={styles.iconButton}
                    onClick={(e) => handleIconClick(e, "description")}
                >
                    {configIcon}
                </button>
            </div>
            <div className={styles.editor}>{renderEditor()}</div>
            <div className={styles.preview}>
                <iframe
                    ref={iframeRef}
                    title="Live Preview"
                    className={styles.previewFrame}
                />
            </div>
            <button className={styles.button}> {/* Users can create a new description intent value, this affects the number of option values for select tag in the BrickDescriptionEditor. This is also a global data change */}
                Save Description
            </button>
            <button className={styles.button}> {/* Clears characters in all tabs, this is not a global change */}
                Clear Description
            </button>
            <button className={styles.button}> {/* Users can delete a description intent value, this affects the number of option values for select tag in the BrickDescriptionEditor. This is also a global data change */}
                Delete Description
            </button>
        </div>
    );
};

export default AdvancedDescription;
