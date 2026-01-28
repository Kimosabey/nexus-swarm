# Getting Started: Nexus Swarm

## Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- OpenAI API Key

## Environment Setup
Create a `.env` file in the project root:
```
OPENAI_API_KEY=your-key-here
```

## Execution

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Backend (FastAPI)
```bash
python -m backend.api.endpoints
```
The API will be available at `http://localhost:8000`

### 3. Install Frontend Dependencies
```bash
cd web
npm install
```

### 4. Start Frontend (Next.js)
```bash
npm run dev
```
The UI will be available at `http://localhost:3000`

## Environment Variables
| Key                    | Description                                |
| :--------------------- | :----------------------------------------- |
| `OPENAI_API_KEY`       | Required for agent reasoning (ChatOpenAI). |
| `LANGCHAIN_TRACING_V2` | (Optional) For LangSmith observability.    |

## Features
- **Glassmorphism UI**: Modern, premium interface with neural particle background
- **Real-time Telemetry**: Watch agents communicate in the Neural Telemetry feed
- **Human-in-the-Loop**: Review research before final synthesis
- **Clear Mission**: Reset state with a single click
