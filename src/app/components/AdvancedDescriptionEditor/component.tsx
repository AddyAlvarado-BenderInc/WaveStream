import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
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

    const saveDescription = async () => {

        try {
            const combinedHTML = generateCombinedHTML();
            const response = await fetch('/api/descriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    descriptionName: 'My Description',
                    html,
                    css,
                    js,
                    combinedHTML,
                }),
            });

            if (response.ok) {
                toast.success('Description saved successfully!');
            } else {
                toast.error('Failed to save description.');
            }
        } catch (error) {
            console.error('Error saving description:', error);
            toast.error('An error occurred while saving.');
        }
        return (
            <>
                <div className={styles.modalContainer}>
                    <h2>Save Your Description</h2>
                    <input value={saveName}></input>
                </div>
            </>
        )
    };

    useEffect(() => {
        const fetchDescriptions = async () => {
            try {
                const response = await fetch('/api/descriptions');
                const data = await response.json();

                if (response.ok) {
                    setDescriptions(data);
                } else {
                    console.error('Failed to fetch descriptions.');
                }
            } catch (error) {
                console.error('Error fetching descriptions:', error);
            }
        };

        fetchDescriptions();
    }, []);

    const deleteDescription = async () => {
        try {
            const response = await fetch('/api/descriptions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'My Description' }),
            });

            if (response.ok) {
                toast.success('Description deleted successfully!');
            } else {
                toast.error('Failed to delete description.');
            }
        } catch (error) {
            console.error('Error deleting description:', error);
            toast.error('An error occurred while deleting.');
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
                    onChange={(e) => {
                        const selectedDescription = description.find(
                            (desc) => desc.name === e.target.value
                        );
                        if (selectedDescription) {
                            setHtml(selectedDescription);
                            setCss(selectedDescription.css);
                            setJs(selectedDescription.js);
                        }
                    }}>
                    <option value="">Select Description</option>
                    {description.map((desc) => (
                        <option key={desc.id} value={desc.name}>
                            {desc.name}
                        </option>
                    ))}
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
            <div className={styles.descriptionButtons}>

                <button className={styles.button} onClick={saveDescription}> {/* Users can create a new description intent value, this affects the number of option values for select tag in the BrickDescriptionEditor. This is also a global data change */}
                    Save Description
                </button>
                <button className={styles.button}> {/* Clears characters in all tabs, this is not a global change */}
                    Clear Description
                </button>
                <button className={styles.button}> {/* Users can delete a description intent value, this affects the number of option values for select tag in the BrickDescriptionEditor. This is also a global data change */}
                    Delete Description
                </button>
            </div>
            <ToastContainer />
        </div>
    );
};

export default AdvancedDescription;
