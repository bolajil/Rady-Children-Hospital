"""
RAG (Retrieval-Augmented Generation) tool for the LangChain agent.
Searches the medical knowledge base for relevant information.
"""

from langchain.tools import BaseTool
from pydantic import BaseModel, Field
from typing import List
import logging

try:
    from app.vector_store import get_knowledge_base, RAG_AVAILABLE
except ImportError:
    RAG_AVAILABLE = False

logger = logging.getLogger(__name__)

class KnowledgeSearchInput(BaseModel):
    query: str = Field(description="The medical query to search the knowledge base for")
    num_results: int = Field(default=3, description="Number of results to return (1-10)")

class MedicalKnowledgeSearchTool(BaseTool):
    name: str = "medical_knowledge_search"
    description: str = """
    Search the medical knowledge base for evidence-based information.
    Use this when you need to find information about:
    - Medical conditions and diseases
    - Treatment protocols and guidelines
    - Research findings and studies
    - Clinical best practices
    
    This tool searches ingested medical literature and returns relevant excerpts.
    """
    args_schema: type[BaseModel] = KnowledgeSearchInput
    
    def _run(self, query: str, num_results: int = 3) -> str:
        """
        Search the knowledge base and return formatted results.
        
        Args:
            query: Search query
            num_results: Number of results to return
            
        Returns:
            Formatted search results
        """
        if not RAG_AVAILABLE:
            return "RAG features are not available. Please install required dependencies: pip install faiss-cpu sentence-transformers pypdf tiktoken"
        
        try:
            # Validate num_results
            num_results = max(1, min(num_results, 10))
            
            # Get knowledge base
            kb = get_knowledge_base()
            
            # Search
            results = kb.search_with_score(query, k=num_results)
            
            if not results:
                return "No relevant information found in the knowledge base. The knowledge base may be empty or the query may not match any indexed content."
            
            # Format results
            formatted_results = f"Found {len(results)} relevant sources:\n\n"
            
            for idx, (doc, score) in enumerate(results, 1):
                source = doc.metadata.get('source', 'Unknown')
                page = doc.metadata.get('page', 'N/A')
                
                formatted_results += f"**Source {idx}** (Relevance: {score:.2f})\n"
                formatted_results += f"From: {source}, Page: {page}\n"
                formatted_results += f"Content: {doc.page_content[:500]}...\n\n"
            
            logger.info(f"Knowledge search completed for: {query[:50]}...")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error in knowledge search: {e}")
            return f"Error searching knowledge base: {str(e)}"
    
    async def _arun(self, query: str, num_results: int = 3) -> str:
        """Async version of the search."""
        return self._run(query, num_results)
