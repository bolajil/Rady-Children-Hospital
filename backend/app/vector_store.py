"""
Vector store implementation using FAISS for local RAG pipeline.
Handles document ingestion, embedding, and semantic search.
"""

import os
import pickle
from typing import List, Optional, Dict
from pathlib import Path
import logging

# Try to import RAG dependencies, but make them optional
try:
    from langchain_community.vectorstores import FAISS
    from langchain_openai import OpenAIEmbeddings
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.document_loaders import PyPDFLoader, TextLoader
    from langchain_core.documents import Document
    RAG_AVAILABLE = True
except ImportError as e:
    RAG_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning(f"RAG dependencies not available: {e}")
    logger.warning("Install with: pip install faiss-cpu sentence-transformers pypdf langchain-text-splitters")
    # Create dummy classes for type hints
    FAISS = None
    Document = None


logger = logging.getLogger(__name__)

class MedicalKnowledgeBase:
    """
    Manages the medical knowledge base using FAISS vector store.
    """
    
    def __init__(self, persist_directory: str = "./data/vector_store"):
        """
        Initialize the knowledge base.
        
        Args:
            persist_directory: Directory to persist the vector store
        """
        if not RAG_AVAILABLE:
            logger.warning("RAG features disabled - dependencies not installed")
            self.vectorstore = None
            return
        
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        self.embeddings = OpenAIEmbeddings()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        self.vectorstore: Optional[FAISS] = None
        self._load_or_create_vectorstore()
    
    def _load_or_create_vectorstore(self):
        """Load existing vector store or create a new one."""
        vectorstore_path = self.persist_directory / "faiss_index"
        
        if vectorstore_path.exists():
            try:
                self.vectorstore = FAISS.load_local(
                    str(vectorstore_path),
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded existing vector store from {vectorstore_path}")
            except Exception as e:
                logger.error(f"Error loading vector store: {e}")
                self.vectorstore = None
        
        if self.vectorstore is None:
            # Create empty vector store with a dummy document
            dummy_doc = Document(
                page_content="Medical knowledge base initialized. Add documents to populate.",
                metadata={"source": "system", "type": "initialization"}
            )
            self.vectorstore = FAISS.from_documents([dummy_doc], self.embeddings)
            self._save_vectorstore()
            logger.info("Created new vector store")
    
    def _save_vectorstore(self):
        """Save the vector store to disk."""
        if self.vectorstore:
            vectorstore_path = self.persist_directory / "faiss_index"
            self.vectorstore.save_local(str(vectorstore_path))
            logger.info(f"Vector store saved to {vectorstore_path}")
    
    def ingest_document(self, file_path: str) -> Dict[str, any]:
        """
        Ingest a document into the knowledge base.
        
        Args:
            file_path: Path to the document (PDF or TXT)
            
        Returns:
            Dictionary with ingestion results
        """
        try:
            file_path = Path(file_path)
            
            # Load document based on file type
            if file_path.suffix.lower() == '.pdf':
                loader = PyPDFLoader(str(file_path))
            elif file_path.suffix.lower() == '.txt':
                loader = TextLoader(str(file_path))
            else:
                raise ValueError(f"Unsupported file type: {file_path.suffix}")
            
            documents = loader.load()
            logger.info(f"Loaded {len(documents)} pages from {file_path.name}")
            
            # Split documents into chunks
            chunks = self.text_splitter.split_documents(documents)
            logger.info(f"Split into {len(chunks)} chunks")
            
            # Add to vector store
            if self.vectorstore is None:
                self.vectorstore = FAISS.from_documents(chunks, self.embeddings)
            else:
                self.vectorstore.add_documents(chunks)
            
            self._save_vectorstore()
            
            return {
                "success": True,
                "file": file_path.name,
                "pages": len(documents),
                "chunks": len(chunks)
            }
            
        except Exception as e:
            logger.error(f"Error ingesting document {file_path}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def search(self, query: str, k: int = 5) -> List[Document]:
        """
        Search the knowledge base for relevant documents.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of relevant documents
        """
        if self.vectorstore is None:
            logger.warning("Vector store not initialized")
            return []
        
        try:
            results = self.vectorstore.similarity_search(query, k=k)
            logger.info(f"Found {len(results)} results for query: {query[:50]}...")
            return results
        except Exception as e:
            logger.error(f"Error searching vector store: {e}")
            return []
    
    def search_with_score(self, query: str, k: int = 5) -> List[tuple]:
        """
        Search with relevance scores.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of (document, score) tuples
        """
        if self.vectorstore is None:
            return []
        
        try:
            results = self.vectorstore.similarity_search_with_score(query, k=k)
            return results
        except Exception as e:
            logger.error(f"Error searching with scores: {e}")
            return []
    
    def get_stats(self) -> Dict[str, any]:
        """Get statistics about the knowledge base."""
        if self.vectorstore is None:
            return {"error": "Vector store not initialized"}
        
        try:
            # Get the number of documents in the index
            index_size = self.vectorstore.index.ntotal
            
            return {
                "total_documents": index_size,
                "embedding_dimension": self.vectorstore.index.d,
                "persist_directory": str(self.persist_directory)
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"error": str(e)}


# Global instance
_knowledge_base: Optional[MedicalKnowledgeBase] = None

def get_knowledge_base() -> MedicalKnowledgeBase:
    """Get or create the global knowledge base instance."""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = MedicalKnowledgeBase()
    return _knowledge_base
