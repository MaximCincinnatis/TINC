# Claude Development Rules for TINC Burn Tracker Dashboard

## Project Overview
This project involves creating a web dashboard to track TINC (Titan Farms Incentive Token) burn events on Ethereum. The dashboard displays daily burn metrics over the last 15 days with automatic updates.

### Smart Contract References
- TINC Token: [0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a](https://etherscan.io/address/0x6532B3F1e4DBff542fbD6befE5Ed7041c10B385a#code)
- FarmKeeper: [0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223](https://etherscan.io/address/0x52C1cC79fbBeF91D3952Ae75b1961D08F0172223#code)
- PeggedFarmKeeper: [0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5](https://etherscan.io/address/0x619095A53ED0D1058DB530CCc04ab5A1C2EF0cD5#code)
- UniversalBuyAndBurn: [0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3](https://etherscan.io/address/0x060E990A7E760f211447E76a53fF6E1Be2f3Bdd3#code)

### Important Configuration
- **Localhost Port**: Always use port 3047, 3048
 for this project
- **Do NOT use ports**: 3000, 4000, 5000 (reserved for other projects)

## Development Workflow Rules

### 1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
Before starting any implementation, thoroughly analyze the requirements and existing code structure. Create a detailed plan that breaks down the work into manageable tasks.

### 2. The plan should have a list of todo items that you can check off as you complete them
Use a structured todo list format with clear, actionable items. Each item should be specific and measurable.

### 3. Before you begin working, check in with me and I will verify the plan.
Always present the plan for approval before making any code changes. This ensures alignment with project goals and expectations.

### 4. Then, begin working on the todo items, marking them as complete as you go.
Track progress in real-time by updating the todo list status as each task is completed. This provides visibility into the development progress.

### 5. Please every step of the way just give me a high level explanation of what changes you made
Provide concise summaries of each change without going into excessive technical detail. Focus on the "what" and "why" rather than the "how".

### 6. Make every task and code change you do as simple as possible.
- Avoid making massive or complex changes
- Every change should impact as little code as possible
- Everything is about simplicity
- Break down complex features into smaller, manageable pieces
- Prefer straightforward solutions over clever optimizations

### 7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.
Document the completed work with:
- Summary of all changes made
- Any important decisions or trade-offs
- Next steps or recommendations
- Potential improvements for future iterations

## Key Development Principles

- **Simplicity First**: Always choose the simplest solution that meets the requirements
- **Incremental Progress**: Make small, testable changes rather than large refactors
- **Clear Communication**: Provide regular updates without overwhelming technical details
- **Structured Planning**: Use todo.md as the single source of truth for task management
- **Minimal Impact**: Each change should affect the smallest possible code surface area

## File Structure
- `tasks/todo.md` - Primary task tracking and review documentation
- `CLAUDE.md` - This file, containing project rules and guidelines

## Memory

- Always follow CLAUDE.md when working on the TINC Burn Tracker Dashboard project
- Always use port 6000 for localhost
- Never use ports 3000, 4000, 5000 (reserved for other projects)
- Always follow "\\wsl$\Ubuntu\home\wsl\projects\TINC\CLAUDE.md"
- Always use port 6000 for localhost for this project. Other projects use other localhost ports. Don't mess with port 3000, 4000, 5000 those localhost are for other projects