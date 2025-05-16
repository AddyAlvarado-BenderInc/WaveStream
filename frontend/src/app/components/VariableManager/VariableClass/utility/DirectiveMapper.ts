interface DirectiveMap {
    [key: string]: {
        type: string,
        effect: string
    }
}

export const directiveMap: DirectiveMap = {
    // Initialize directive allows the user to initialize a manager directive for attribute directives
    // allowing inline editing of the main key string
    "$INIT" : {
        type: "initializer",
        effect: "Initialize"
    },
    // The $COMP directive allows the user to create a composite effect which will be read at the manager level (meaning no effect value is passed but only read at the class level)
    // and will be used to create a composite array value for a table cell via the string structure
    "$COMP" : {
        type: "manager",
        effect: "Composite"
    },
    "$CAPITAL": {
        type: "attribute",
        effect: "Capitalize"
    },
    "$UPPER" : {
        type: "attribute",
        effect: "Uppercase"
    },
    "$LOWER" : {
        type: "attribute",
        effect: "Lowercase"
    },
    "$TRIM" : {
        type: "attribute",
        effect: "Trim"
    },
    "$TRIMLEFT" : {
        type: "attribute",
        effect: "TrimLeft"
    },
    "$TRIMRIGHT" : {
        type: "attribute",
        effect: "TrimRight"
    },
    "$LENGTH" : {
        type: "attribute",
        effect: "Length"
    },
    "$REPEAT" : {
        type: "attribute",
        effect: "Repeat"
    },
    "$REPLACE" : {
        type: "attribute",
        effect: "Replace"
    },
};