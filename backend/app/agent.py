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

# Try to import from new API, fallback to old API
try:
    from langchain.agents import create_tool_calling_agent, AgentExecutor
except ImportError:
    # Older LangChain version - use different imports
    try:
        from langchain.agents import initialize_agent, AgentType
        from langchain.agents import AgentExecutor
        create_tool_calling_agent = None  # Will use initialize_agent instead
    except ImportError:
        create_tool_calling_agent = None
        AgentExecutor = None

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
    # Initialize LLM with GPT-4
    llm = ChatOpenAI(
        model="gpt-4-turbo-preview",
        temperature=0,
        api_key=api_key
    )

    # Create prompt template
    system_message = """You are a medical assistant AI for Rady Children's Health, a pediatric healthcare facility.

Your role:
- Provide accurate, evidence-based medical information
- Help clinicians with patient care decisions
- Assist with medication information and interactions
- Access clinical guidelines and protocols

IMPORTANT GUIDELINES:
1. **Safety First**: Never provide definitive diagnoses. Always recommend consulting with healthcare providers.
2. **HIPAA Compliance**: Maintain patient privacy. Log all data access.
3. **Evidence-Based**: Base responses on current medical literature and guidelines.
4. **Pediatric Focus**: All recommendations should be appropriate for children.
5. **Acknowledge Limitations**: Be clear about uncertainties and when to seek specialist input.

Available Tools:
- patient_info: Look up patient demographic and medical history
- medication_guide: Get detailed medication information

Always prioritize patient safety and quality of care."""

    # Try new API first, fall back to old API
    if create_tool_calling_agent is not None:
        # New LangChain API
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        agent = create_tool_calling_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
        )
    else:
        # Old LangChain API (fallback)
        try:
            agent_executor = initialize_agent(
                tools=tools,
                llm=llm,
                agent=AgentType.OPENAI_FUNCTIONS,
                verbose=True,
                max_iterations=5,
                agent_kwargs={
                    "system_message": system_message,
                }
            )
        except Exception as e:
            logger.error(f"Failed to initialize agent with old API: {e}")
            # Ultimate fallback - create a simple wrapper
            class SimpleAgentExecutor:
                def __init__(self, llm, tools):
                    self.llm = llm
                    self.tools = tools
                
                def invoke(self, inputs: dict) -> dict:
                    from langchain_core.messages import HumanMessage
                    user_input = inputs.get("input", "")
                    response = self.llm.invoke([
                        HumanMessage(content=f"{system_message}\n\nUser: {user_input}")
                    ])
                    return {"output": response.content}
            
            agent_executor = SimpleAgentExecutor(llm, tools)

    logger.info("LangChain agent initialized successfully with OpenAI GPT-4")
