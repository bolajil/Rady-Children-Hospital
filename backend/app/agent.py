from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Optional
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# LangChain 1.0+ uses langgraph for agents
try:
    from langgraph.prebuilt import create_react_agent
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    create_react_agent = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import RAG tool if available
try:
    from app.rag_tool import MedicalKnowledgeSearchTool, RAG_AVAILABLE
    if RAG_AVAILABLE:
        logger.info("RAG features enabled")
    else:
        logger.warning("RAG features disabled - missing dependencies")
except ImportError:
    RAG_AVAILABLE = False
    MedicalKnowledgeSearchTool = None
    logger.warning("RAG tool not available")

# Sample medical tools for demonstration
class PatientInfoInput(BaseModel):
    patient_id: str = Field(description="The patient ID to look up")

class PatientInfoTool(BaseTool):
    name: str = "patient_info"
    description: str = """
    Retrieves basic patient information given a patient ID.
    Use this when you need to access patient demographic data or basic medical history.
    """
    args_schema: type[BaseModel] = PatientInfoInput
    
    def _run(self, patient_id: str) -> str:
        logger.info(f"HIPAA_AUDIT: Accessed patient info for ID: {patient_id}")
        # This is a mock response - in production, integrate with FHIR/EMR
        return f"""
Patient ID: {patient_id}
Name: [Sample Patient - Replace with FHIR integration]
Age: 8 years old
Last Visit: 2024-01-15
Allergies: None documented
Current Medications: None

Note: This is sample data. Implement FHIR integration for production use.
"""

class MedicationGuideInput(BaseModel):
    medication_name: str = Field(description="Name of the medication")

class MedicationGuideTool(BaseTool):
    name: str = "medication_guide"
    description: str = """
    Provides detailed information about a specific medication including dosing,
    side effects, and contraindications. Use this when answering medication questions.
    """
    args_schema: type[BaseModel] = MedicationGuideInput
    
    def _run(self, medication_name: str) -> str:
        return f"""
Medication: {medication_name}

[In production, this would query pharmaceutical databases like RxNorm or DrugBank]

General Information:
- Indication: [Retrieved from drug database]
- Pediatric Dosing: [Age/weight-based dosing]
- Common Side Effects: [List from database]
- Contraindications: [Medical conditions that preclude use]
- Drug Interactions: [Known interactions]

Always verify dosing with current clinical guidelines.
"""

# Initialize tools (including RAG if available)
tools = [
    PatientInfoTool(),
    MedicationGuideTool(),
]

# Add RAG tool if dependencies are installed
if RAG_AVAILABLE and MedicalKnowledgeSearchTool:
    tools.append(MedicalKnowledgeSearchTool())
    logger.info("Added RAG knowledge search tool to agent")

# Check for OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")

# Initialize llm as None (will be set if API key is available)
llm = None

if not api_key:
    logger.warning("OPENAI_API_KEY not found in environment variables. Agent will use mock responses.")
    logger.info("Please set OPENAI_API_KEY in backend/.env file")
    # Fallback to mock agent
    class MockAgentExecutor:
        def invoke(self, inputs: dict) -> dict:
            user_input = inputs.get("input", "")
            return {
                "output": f"""Hello! I'm the Rady Children's Health Medical Assistant.

You asked: {user_input}

⚠️ **Configuration Required**: 
To use the full AI capabilities, please set your OPENAI_API_KEY in the .env file.

For now, I'm running in demo mode. In production, I would:
✓ Use GPT-4 for medical reasoning
✓ Access patient records via FHIR
✓ Check medication interactions
✓ Provide evidence-based clinical guidance
✓ Maintain HIPAA-compliant audit logs

Available demo tools:
- Patient information lookup
- Medication guide
"""
            }
    
    agent_executor = MockAgentExecutor()
else:
    # Initialize LLM with a fast, high-quality model
    # gpt-4o-mini offers a strong quality:latency balance for demos
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=api_key,
        timeout=20,
    )

    # Create prompt template
    system_message = """You are a helpful medical education assistant AI for Rady Children's Health, a pediatric healthcare facility.

Your role:
- Provide accurate, evidence-based medical education and information
- Answer questions about medical conditions, diseases, treatments, and pediatric health
- Help with medication information and clinical guidelines
- Assist clinicians and users with general medical knowledge

GUIDELINES:
1. Be helpful and educational - answer questions thoroughly using your medical knowledge
2. Focus on pediatric health - recommendations should be appropriate for children
3. Recommend consulting healthcare providers for specific diagnoses or treatment decisions
4. Base responses on current medical literature and guidelines

Always be helpful, informative, and prioritize patient safety."""

    # Simple direct LLM wrapper (works reliably with LangChain 1.0+)
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    import time
    
    # Try to import LangFuse for tracing
    try:
        from app.langfuse_integration import get_langfuse_callback, LANGFUSE_AVAILABLE
        LANGFUSE_AGENT_AVAILABLE = LANGFUSE_AVAILABLE
    except ImportError:
        LANGFUSE_AGENT_AVAILABLE = False
        get_langfuse_callback = None
    
    class DirectLLMExecutor:
        def __init__(self, api_key, tools, system_prompt):
            self.api_key = api_key
            self.tools = tools
            self.system_prompt = system_prompt
        
        def invoke(self, inputs: dict, session_id: str = None) -> dict:
            user_input = inputs.get("input", "")
            chat_history = inputs.get("chat_history", [])
            session_id = inputs.get("session_id", session_id)
            
            # Build callbacks list for LangFuse tracing
            callbacks = []
            if LANGFUSE_AGENT_AVAILABLE and get_langfuse_callback:
                langfuse_cb = get_langfuse_callback(
                    session_id=session_id,
                    metadata={"executor": "DirectLLMExecutor", "model": "gpt-4o-mini"}
                )
                if langfuse_cb:
                    callbacks.append(langfuse_cb)
            
            # Create fresh LLM instance for each call with callbacks
            fresh_llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0,
                api_key=self.api_key,
                timeout=30,
                callbacks=callbacks if callbacks else None,
            )
            
            # Build messages with system prompt, history, and user input
            messages = [SystemMessage(content=self.system_prompt)]
            
            # Add chat history if present
            if chat_history:
                messages.extend(chat_history)
            
            # Add current user message
            messages.append(HumanMessage(content=user_input))
            
            logger.info(f"DirectLLMExecutor: Invoking LLM with {len(messages)} messages")
            
            # Track latency
            start_time = time.time()
            
            # Call LLM directly
            response = fresh_llm.invoke(messages)
            
            # Calculate latency
            latency_ms = (time.time() - start_time) * 1000
            
            # Extract token usage if available
            token_usage = {}
            if hasattr(response, 'response_metadata'):
                token_usage = response.response_metadata.get('token_usage', {})
            elif hasattr(response, 'usage_metadata'):
                token_usage = response.usage_metadata or {}
            
            logger.info(f"DirectLLMExecutor: Response in {latency_ms:.0f}ms, tokens: {token_usage}")
            
            return {
                "output": response.content,
                "latency_ms": latency_ms,
                "token_usage": token_usage
            }
    
    agent_executor = DirectLLMExecutor(api_key, tools, system_message)
    logger.info("Created direct LLM executor")

    logger.info("LangChain agent initialized successfully with OpenAI GPT-4")
