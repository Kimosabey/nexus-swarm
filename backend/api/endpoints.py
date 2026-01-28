from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
from backend.core.graph import create_swarm
import uuid

app = FastAPI(title="Nexus Swarm API")

# Enable CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active swarms (thread_id -> graph)
# In production, we would use a persistent checkpointer like Postgres/Redis
active_swarms = {}

class MissionRequest(BaseModel):
    goal: str
    model: str = "gpt-4o-mini"

class ApprovalRequest(BaseModel):
    thread_id: str
    approve: bool

@app.post("/mission/initialize")
async def initialize_mission(req: MissionRequest):
    thread_id = str(uuid.uuid4())
    graph = create_swarm(model=req.model)
    
    initial_state = {
        "goal": req.goal,
        "iterations": 0,
        "research_notes": [],
        "draft": "",
        "revision_notes": ""
    }
    
    # Store app state in memory for this session
    active_swarms[thread_id] = {
        "graph": graph,
        "state": initial_state
    }
    
    return {"thread_id": thread_id, "status": "initialized"}

@app.get("/mission/stream/{thread_id}")
async def stream_mission(thread_id: str):
    if thread_id not in active_swarms:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    swarm = active_swarms[thread_id]
    config = {"configurable": {"thread_id": thread_id}}
    
    results = []
    # Stream the graph execution
    for event in swarm["graph"].stream(swarm["state"], config, stream_mode="updates"):
        results.append(event)
        
    # Check if we hit an interrupt
    state = swarm["graph"].get_state(config)
    is_paused = len(state.next) > 0
    
    # Update local state storage
    swarm["state"] = None # Reset initial state for next run
    
    return {
        "events": results,
        "is_paused": is_paused,
        "current_state": state.values
    }

@app.post("/mission/approve")
async def approve_research(req: ApprovalRequest):
    if req.thread_id not in active_swarms:
        raise HTTPException(status_code=404, detail="Mission not found")
    
    swarm = active_swarms[req.thread_id]
    config = {"configurable": {"thread_id": req.thread_id}}
    
    if req.approve:
        results = []
        # Resume the graph
        for event in swarm["graph"].stream(None, config, stream_mode="updates"):
            results.append(event)
        
        final_state = swarm["graph"].get_state(config)
        return {
            "events": results,
            "final_output": final_state.values.get("draft", ""),
            "status": "completed"
        }
    else:
        return {"status": "terminated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
