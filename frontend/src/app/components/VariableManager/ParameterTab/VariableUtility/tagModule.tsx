import React, { useState, useEffect } from 'react';
import styles from './component.module.css';

interface TaggingModalProps {
    isOpen: boolean;
    onClose: () => void;
    parameterName: string;
    parameterValue: string;
    currentTags: string[];
    onSaveTags: (newTags: string[]) => void;
}

const TaggingModal: React.FC<TaggingModalProps> = ({
    isOpen,
    onClose,
    parameterName,
    parameterValue,
    currentTags,
    onSaveTags
}) => {
    const [tags, setTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setTags([...currentTags]);
        }
    }, [isOpen, currentTags]);

    if (!isOpen) {
        return null;
    }

    const handleAddTag = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmedTag = newTagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
        }
        setNewTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSave = () => {
        onSaveTags(tags);
        onClose();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>×</button>
                <h2>Manage Tags</h2>
                <p>Parameter: <strong>{parameterName}</strong></p>
                <p>Value: <strong>{parameterValue}</strong></p>

                <div className={styles.tagsDisplay}>
                    {tags.length > 0 ? (
                        tags.map((tag, index) => (
                            <span key={index} className={styles.tagItem}>
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)}>&times;</button>
                            </span>
                        ))
                    ) : (
                        <p><i>No tags added yet.</i></p>
                    )}
                </div>

                <form onSubmit={handleAddTag} className={styles.addTagForm}>
                    <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Enter new tag"
                    />
                    <button type="submit">Add Tag</button>
                </form>

                <div className={styles.modalActions}>
                    <button onClick={handleSave}>Save Tags</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default TaggingModal;