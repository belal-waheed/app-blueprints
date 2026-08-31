# Pattern Blueprint Schema (How to Add New Patterns)

Use this markdown schema when documenting and contributing new architectural patterns or snippets to `app-blueprints`.

---

## Pattern Name: `[Descriptive Pattern Name]`

### 1. Problem Solved & Context
*Explain what problem this pattern solves, what edge cases exist, and why standard naive approaches fail.*

### 2. Architecture & Sequence Diagram
```text
[Client / Frontend] ──► [Service / API Boundary] ──► [Database / Cloud Provider]
```

### 3. Implementation Code (TypeScript)
*Provide copy-pasteable, clean-architecture code with full type definitions.*

### 4. Configuration & Environment Variables
```env
# Required environment variables
MY_API_KEY=your_key_here
```

### 5. Troubleshooting & Gotchas
| Symptom | Root Cause | Verified Solution |
| :--- | :--- | :--- |
| `Error message` | Why it happened | Exact fix |

### 6. AI Agent Prompt
*Provide a copyable prompt for AI coding assistants to apply this pattern in 1 shot.*
