from langgraph.graph import StateGraph, END
from backend.core.state import AgentState
from backend.core.agents import SwarmAgents
from langgraph.checkpoint.memory import MemorySaver

def create_swarm(model="gpt-4o-mini"):
    agents = SwarmAgents(model=model)
    workflow = StateGraph(AgentState)
    checkpointer = MemorySaver()

    # Define Nodes
    workflow.add_node("manager", agents.manager)
    workflow.add_node("researcher", agents.researcher)
    workflow.add_node("writer", agents.writer)
    workflow.add_node("reviewer", agents.reviewer)

    # Build Graph Connections
    workflow.set_entry_point("manager")

    workflow.add_conditional_edges(
        "manager",
        lambda x: x["next_agent"],
        {
            "researcher": "researcher",
            "writer": "writer"
        }
    )

    workflow.add_edge("researcher", "manager")
    workflow.add_edge("writer", "reviewer")

    workflow.add_conditional_edges(
        "reviewer",
        lambda x: "complete" if x["revision_notes"] == "APPROVED" else "manager",
        {
            "complete": END,
            "manager": "manager"
        }
    )

    # Compile with checkpointer and an interrupt before the Writer
    return workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=["writer"]
    )
