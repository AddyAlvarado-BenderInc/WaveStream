````markdown
# Main Key String Inline Operations Syntax and Examples

## Overview

This document explains the usage of `$COMP`, `$INIT`, and other directives in the Variable Class. It includes examples of valid and invalid cases, along with the expected outputs in JSON or error messages.

---

## Examples

### Example 1
**Input:**
```plaintext
$COMP<%{a} %{b} %{c} %{d}> This text will be added foreach InterpolatedVariable
a = [1:a, 2:a, 3:a];
b = [1:b, 2:b, 3:b];
c = [1:c, 2:c, 3:c];
````

**Result (JSON):**

```json
{
  "a": {
    "Composite": [
      "1 This text will be added foreach InterpolatedVariable",
      "2 This text will be added foreach InterpolatedVariable",
      "3 This text will be added foreach InterpolatedVariable"
    ]
  },
  "b": {
    "Composite": [
      "1 This text will be added foreach InterpolatedVariable",
      "2 This text will be added foreach InterpolatedVariable",
      "3 This text will be added foreach InterpolatedVariable"
    ]
  },
  "c": {
    "Composite": [
      "1 This text will be added foreach InterpolatedVariable",
      "2 This text will be added foreach InterpolatedVariable",
      "3 This text will be added foreach InterpolatedVariable"
    ]
  }
}
```

---

### Example 2

**Input:**

```plaintext
$COMP<%{a} %{b} %{c} %{d}> $COMP<Multiple of the same directives are invalid>
```

**Result:**

```plaintext
Invalid: Syntax Error: Cannot have multiple manager-level directives in MKS
```

---

### Example 3

**Input:**

```plaintext
$COMP<In this directive, string input is invalid (must only take %{IntVar})>
```

**Result:**

```plaintext
Invalid: Syntax Error: Argument of $COMP directive cannot have strings, only IntVars are allowed
```

---

### Example 4

**Input:**

```plaintext
$COMP<%{a} %{b} %{c} %{d}>:$UPPER - attribute directives added on the end of manager directives
a = [a:a, b:a, c:a];
b = [a:b, b:b, c:b];
```

**Result (JSON):**

```json
{
  "a": {
    "Composite": ["A", "B", "C"]
  },
  "b": {
    "Composite": ["A", "B", "C"]
  },
  "c": {
    "Composite": ["A", "B", "C"]
  },
  "d": {
    "Composite": ["A", "B", "C"]
  }
}
```

---

## Explanation of directives

### Manager directives

* Operate at the **manager level** as JSX elements.
* Examples: `$COMP`, `$UPPER`.
* Read by the `VariableManager` and interpreted via string structure.

#### Example Workflow:

1. Input in `VariableManager`:

   ```plaintext
   $COMP<21 22 23 24 25>
   ```
2. Upon sending the data as "Composite":

   ```json
   {
     "Example": {
       "Composite": ["21", "22", "23", "24", "25"]
     }
   }
   ```
3. Table Representation:

   ```plaintext
   COMP - Example (5)
     - 21
     - 22
     - 23
     - 24
     - 25
   ```

### Attribute directives

* Operate at the **variableClass level**.
* Use functions defined in `attributeRules.ts`.

---

### `$INIT` directive

* A special **initializer** directive.
* Initializes permissions for attribute execution in MKS.
* **Cannot pair with other manager directives** (e.g., `$COMP`).

#### Example 1:

**Input:**

```plaintext
$INIT<Some type of string %{IntVar} will be capitalized>:$CAPITAL:$TRIM
IntVar = [Variable1, Variable2, Variable3]
```

**Result:**

```plaintext
SOMETYPEOFSTRINGVARIABLE1WILLBECAPITALIZED,
SOMETYPEOFSTRINGVARIABLE2WILLBECAPITALIZED,
SOMETYPEOFSTRINGVARIABLE3WILLBECAPITALIZED
```

#### Example 2:

**Input:**

```plaintext
$INIT<Anything in here will be read as a string $INIT>:$LOWER
```

**Result:**

```plaintext
anything in here will be read as a string $init
```

#### Example 3:

**Input:**

```plaintext
$INIT<Cannot execute with another manager directive>:$UPPER:$TRIM:$LOWER:$COMP
```

**Result:**

```plaintext
Invalid: Syntax Error: $INIT cannot pair with another manager directive ($COMP)
```

---

## Notes on Execution

* **Manager directives** must execute first.
* **Attribute directives** require initialization via `$INIT`.
* **Effects** depend on the type of directive (manager, attribute, initializer).

Feel free to use this document as a reference when configuring the Variable Manager.

```
## Final Thoughts and Mission Statement

As more cases for directives are built, there will be a requirement to put more thought into the logic as the only data type most of these directives accept are Array, String, and Number. A good use case for each directive is building effects on the table, this prevents needing to create new object entries in the table, saving performance and database/storage space while keeping the codebase more maintainable and the table feature-rich. As the codebase scales, inline directives prevent the need to create new object data and future-bloat.