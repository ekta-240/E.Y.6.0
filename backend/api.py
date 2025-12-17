from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from backend.llm.qa_summarizer import summarize_qa_decision
from backend.llm.gemini_client import call_gemini, QuotaExceededError
import time
from collections import defaultdict

router = APIRouter()

RATE_LIMIT = 5        # max 5 explanations
RATE_WINDOW = 60      # per 60 seconds
_request_log = defaultdict(list)

CHAT_RATE_LIMIT = 10
CHAT_RATE_WINDOW = 60
_chat_log = defaultdict(list)


class ExplainRequest(BaseModel):
    field: str
    current_value: str | None
    candidates: list
    chosen_value: str | None
    confidence: float
    decision: str


class ExplainResponse(BaseModel):
    explanation: str


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    response: str


@router.post("/explain", response_model=ExplainResponse)
def explain_decision(payload: ExplainRequest, request: Request):
    # -------- RATE LIMIT (DEV-SAFE) --------
    client_ip = request.client.host
    now = time.time()

    # Keep only recent timestamps
    _request_log[client_ip] = [
        t for t in _request_log[client_ip]
        if now - t < RATE_WINDOW
    ]

    if len(_request_log[client_ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before requesting more explanations."
        )

    _request_log[client_ip].append(now)
    # --------------------------------------

    try:
        explanation = summarize_qa_decision(payload.model_dump())
        return {"explanation": explanation}
    except Exception as e:
        # Fallback to deterministic explanation to keep endpoint responsive
        fallback = (
            f"Decision for {payload.field}: chose {payload.chosen_value} "
            f"with confidence {payload.confidence:.2f} from sources {payload.candidates}."
        )
        return {"explanation": fallback}


@router.post("/chat", response_model=ChatResponse)
def chat_with_ai(payload: ChatRequest, request: Request):
    """General purpose AI chatbot endpoint"""
    client_ip = request.client.host
    now = time.time()

    # Rate limiting
    _chat_log[client_ip] = [
        t for t in _chat_log[client_ip]
        if now - t < CHAT_RATE_WINDOW
    ]

    if len(_chat_log[client_ip]) >= CHAT_RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before sending more messages."
        )

    _chat_log[client_ip].append(now)

    # Build conversation context
    system_prompt = """You are a helpful AI assistant for EY's Provider Data Command Center application. 
You can help users with:
- Understanding provider data validation processes
- Explaining PCS (Provider Credibility Score) metrics
- Discussing data drift analysis and risk levels
- Helping with manual review workflows
- General questions about healthcare provider directories
- Any other general questions the user might have

Be concise, helpful, and professional. If asked about something unrelated to the application, 
you can still help but mention that you're primarily designed for provider data assistance.

Keep responses under 150 words unless more detail is specifically requested."""

    # Format conversation history
    conversation = ""
    for msg in payload.history[-6:]:  # Last 6 messages for context
        role = "User" if msg.get("role") == "user" else "Assistant"
        conversation += f"{role}: {msg.get('content', '')}\n"
    
    conversation += f"User: {payload.message}\nAssistant:"

    full_prompt = f"{system_prompt}\n\nConversation:\n{conversation}"

    try:
        response = call_gemini(full_prompt)
        return {"response": response}
    except QuotaExceededError:
        raise HTTPException(
            status_code=429,
            detail="AI service quota exceeded. Please try again later."
        )
    except ValueError as e:
        # API key not set
        return {"response": "I'm currently unavailable. Please ensure the AI service is configured properly. In the meantime, I can tell you that this application helps validate healthcare provider data using multi-agent AI systems."}
    except Exception as e:
        return {"response": "I encountered an issue processing your request. Please try again or rephrase your question."}
