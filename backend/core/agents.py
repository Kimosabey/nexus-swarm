import os
from dotenv import load_dotenv
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from backend.core.state import AgentState

load_dotenv()

from langchain_community.tools import DuckDuckGoSearchRun

class SwarmAgents:
    def __init__(self, model="gpt-4o-mini"):
        self.llm = ChatOpenAI(model=model, temperature=0.2)
        self.search_tool = DuckDuckGoSearchRun()

    def manager(self, state: AgentState):
        """Orchestrates the swarm and sets the plan."""
        print("--- MANAGER NODE ---")
        if len(state.get('research_notes', [])) >= 2:
            print("Manager: Sufficient research gathered (>= 2 items), switching to WRITER.")
            return {"next_agent": "writer", "iterations": state.get("iterations", 0) + 1}

        prompt = f"""
        You are the Swarm Manager. Goal: {state['goal']}
        Current Iteration: {state['iterations']}
        Research Count: {len(state.get('research_notes', []))}
        
        Your job is to decide the next step.
        - If research is strictly insufficient (0 items), choose 'researcher'.
        - Otherwise, choose 'writer'.
        
        Return ONLY one word:
        researcher
        writer
        """
        response = self.llm.invoke([SystemMessage(content=prompt)])
        content = response.content.strip().lower()
        
        if "researcher" in content: next_agent = "researcher"
        else: next_agent = "writer"

        return {
            "next_agent": next_agent, 
            "iterations": state.get("iterations", 0) + 1
        }

    def researcher(self, state: AgentState):
        """Uses DuckDuckGo to gather real data."""
        print("--- RESEARCHER NODE ---")
        query = state['goal'] # In a more advanced version, we'd ask the LLM for a specific query
        print(f"Searching for: {query}...")
        try:
            result = self.search_tool.run(query)
            return {"research_notes": [result]}
        except Exception as e:
            print(f"Search failed: {e}")
            return {"research_notes": ["Search failed, proceeding with known data."]}

    def writer(self, state: AgentState):
        """Generates the final draft."""
        print("--- WRITER NODE ---")
        prompt = f"Write a professional summary based on this research: {state['research_notes']}"
        response = self.llm.invoke([HumanMessage(content=prompt)])
        return {"draft": response.content}

    def reviewer(self, state: AgentState):
        """Critiques the draft and decides if it's done."""
        print("--- REVIEWER NODE ---")
        # For simplicity, we'll mark as complete if iteration > 1
        if state['iterations'] > 2:
            return {"revision_notes": "APPROVED"}
        return {"revision_notes": "Needs more detail."}
