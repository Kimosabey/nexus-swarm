# Failure Scenarios: Nexus Swarm

## Fault Analysis
1. **Model Hallucination**: An agent produces invalid JSON or a logic error.
   - **Recovery**: Validation nodes (Pydantic) catch the error and route it back to the agent with the error message for self-correction.
2. **Infinite Loops**: Agents cycle between Writer and Reviewer indefinitely.
   - **Recovery**: `iterations` counter in the `AgentState` caps the loop and escapes to a "Human-in-the-Loop" node or terminates with a partial result.
3. **API Rate Limits**:
   - **Recovery**: Implementation of exponential backoff at the provider layer.
