## Git ACP (Add, Commit, Push) Command

### **Command: "git acp"**
When the user says **"git acp"**, perform this automated workflow:

Write the commit in a single block without any extra text:

```
    cd /Users/pre-press2/Desktop/PrintApproverAPI && git add . && git commit -m "docs: session update - [brief summary]
    Updated files:
    - [list of files changed]
    Changes:
    - [key changes made]
    Fixes:
    - [bugs fixed]
    Improvements:
    - [enhancements added]" && git push origin main
```

#### **1. Staging Changes**
- Stage all modified files for commit
- Include documentation updates and code changes

#### **2. Commit Creation**
- Create a commit with a descriptive message
- Include details about changes made, bugs fixed, and improvements added

#### **3. Push Changes**
- Push the committed changes to the remote repository
- Ensure the correct branch is targeted