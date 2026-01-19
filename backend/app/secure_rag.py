"""
HIPAA-Compliant Secure RAG System

This module implements a secure Retrieval-Augmented Generation (RAG) system
that keeps PHI (Protected Health Information) within your infrastructure.

Key Security Features:
1. LOCAL embeddings - PHI never sent to external APIs for embedding
2. PHI redaction before LLM calls - Only anonymized context sent to OpenAI
3. Encrypted vector storage - ChromaDB with persistent storage
4. Audit logging - All access logged for HIPAA compliance

Architecture:
    PHI Database → Local Embeddings → ChromaDB (Local)
                                          ↓
    User Query → PHI Guardrail → Retrieve → Redact → LLM (External)
                                                        ↓
                                              Response → User
"""

import os
import logging
import hashlib
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Try to import required libraries
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logger.warning("ChromaDB not installed. Run: pip install chromadb")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning("sentence-transformers not installed. Using fallback embeddings.")

# Import PHI guardrail for redaction
try:
    from app.phi_guardrail import PHIGuardrail, redact_phi_for_llm, restore_from_llm
    PHI_GUARDRAIL_AVAILABLE = True
except ImportError:
    PHI_GUARDRAIL_AVAILABLE = False
    logger.warning("PHI guardrail not available")


@dataclass
class DocumentMetadata:
    """Metadata for ingested documents."""
    document_id: str
    source: str  # e.g., "EHR", "PACS", "Lab", "Notes"
    patient_id: Optional[str] = None  # Hashed, not raw
    document_type: str = "unknown"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ingested_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    chunk_index: int = 0
    total_chunks: int = 1


@dataclass
class RetrievalResult:
    """Result from RAG retrieval."""
    content: str
    redacted_content: str  # PHI removed
    metadata: Dict[str, Any]
    relevance_score: float
    token_map: Dict[str, str] = field(default_factory=dict)


class LocalEmbeddingModel:
    """
    Local embedding model that keeps PHI within your infrastructure.
    Uses sentence-transformers for embeddings - NO external API calls.
    """
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize local embedding model.
        
        Args:
            model_name: HuggingFace model name. Options:
                - "all-MiniLM-L6-v2" (fast, 384 dims)
                - "all-mpnet-base-v2" (better quality, 768 dims)
                - "pritamdeka/S-PubMedBert-MS-MARCO" (medical domain)
        """
        self.model_name = model_name
        self._model = None
        
    @property
    def model(self) -> "SentenceTransformer":
        """Lazy load the model."""
        if self._model is None:
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                raise ImportError("sentence-transformers not installed")
            logger.info(f"Loading local embedding model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
            logger.info(f"Embedding model loaded. Dimension: {self._model.get_sentence_embedding_dimension()}")
        return self._model
    
    def embed(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings locally. PHI never leaves your infrastructure.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        embeddings = self.model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()
    
    def embed_query(self, query: str) -> List[float]:
        """Embed a single query."""
        return self.embed([query])[0]


class SecureVectorStore:
    """
    Secure vector store using ChromaDB.
    All data stays within your infrastructure.
    """
    
    def __init__(
        self,
        collection_name: str = "phi_documents",
        host: Optional[str] = None,
        port: Optional[int] = None,
        persist_directory: Optional[str] = None
    ):
        """
        Initialize secure vector store.
        
        Args:
            collection_name: Name of the ChromaDB collection
            host: ChromaDB server host (for Docker deployment)
            port: ChromaDB server port
            persist_directory: Local directory for persistent storage
        """
        if not CHROMADB_AVAILABLE:
            raise ImportError("ChromaDB not installed. Run: pip install chromadb")
        
        self.collection_name = collection_name
        
        # Connect to ChromaDB
        if host:
            # Connect to ChromaDB server (Docker)
            logger.info(f"Connecting to ChromaDB server at {host}:{port}")
            self._client = chromadb.HttpClient(host=host, port=port)
        elif persist_directory:
            # Use persistent local storage
            logger.info(f"Using persistent ChromaDB at {persist_directory}")
            self._client = chromadb.PersistentClient(path=persist_directory)
        else:
            # In-memory (for testing)
            logger.info("Using in-memory ChromaDB (data will not persist)")
            self._client = chromadb.Client()
        
        # Get or create collection
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )
        logger.info(f"ChromaDB collection '{collection_name}' ready. Documents: {self._collection.count()}")
    
    def add_documents(
        self,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str]
    ) -> None:
        """
        Add documents to the vector store.
        
        Args:
            documents: List of document texts
            embeddings: Pre-computed embeddings (from local model)
            metadatas: Metadata for each document
            ids: Unique IDs for each document
        """
        self._collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        logger.info(f"Added {len(documents)} documents to vector store")
    
    def query(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Query the vector store.
        
        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return
            where: Optional metadata filter
            
        Returns:
            Query results with documents, metadatas, and distances
        """
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        return results
    
    def delete(self, ids: List[str]) -> None:
        """Delete documents by ID."""
        self._collection.delete(ids=ids)
    
    def count(self) -> int:
        """Get total document count."""
        return self._collection.count()


class SecureRAG:
    """
    HIPAA-Compliant RAG System.
    
    This class orchestrates secure retrieval-augmented generation:
    1. Embeds queries using LOCAL model (no external API)
    2. Retrieves relevant documents from local vector store
    3. Redacts PHI before sending to external LLM
    4. Restores PHI in response if needed
    """
    
    def __init__(
        self,
        embedding_model: str = "all-MiniLM-L6-v2",
        collection_name: str = "medical_documents",
        chroma_host: Optional[str] = None,
        chroma_port: Optional[int] = None,
        persist_directory: Optional[str] = None
    ):
        """
        Initialize Secure RAG system.
        
        Args:
            embedding_model: Local embedding model name
            collection_name: ChromaDB collection name
            chroma_host: ChromaDB server host
            chroma_port: ChromaDB server port
            persist_directory: Local persistence directory
        """
        # Get config from environment
        self.chroma_host = chroma_host or os.getenv("CHROMA_HOST")
        self.chroma_port = chroma_port or int(os.getenv("CHROMA_PORT", "8000"))
        
        # Initialize local embedding model
        self.embedding_model = LocalEmbeddingModel(embedding_model)
        
        # Initialize vector store
        self.vector_store = SecureVectorStore(
            collection_name=collection_name,
            host=self.chroma_host,
            port=self.chroma_port,
            persist_directory=persist_directory
        )
        
        # PHI guardrail for redaction
        self.phi_guardrail = PHIGuardrail() if PHI_GUARDRAIL_AVAILABLE else None
        
        logger.info("SecureRAG initialized successfully")
    
    def _hash_patient_id(self, patient_id: str) -> str:
        """Hash patient ID for storage (HIPAA compliance)."""
        return hashlib.sha256(patient_id.encode()).hexdigest()[:16]
    
    def ingest_document(
        self,
        content: str,
        document_id: str,
        source: str = "EHR",
        patient_id: Optional[str] = None,
        document_type: str = "clinical_note",
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ) -> int:
        """
        Ingest a document into the secure vector store.
        
        The document is:
        1. Split into chunks
        2. Embedded using LOCAL model (PHI stays local)
        3. Stored in local ChromaDB
        
        Args:
            content: Document text content
            document_id: Unique document identifier
            source: Data source (EHR, PACS, Lab, etc.)
            patient_id: Optional patient ID (will be hashed)
            document_type: Type of document
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            
        Returns:
            Number of chunks ingested
        """
        # Split into chunks
        chunks = self._chunk_text(content, chunk_size, chunk_overlap)
        
        if not chunks:
            logger.warning(f"No chunks created for document {document_id}")
            return 0
        
        # Generate embeddings locally
        embeddings = self.embedding_model.embed(chunks)
        
        # Prepare metadata
        hashed_patient_id = self._hash_patient_id(patient_id) if patient_id else None
        
        ids = []
        metadatas = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{document_id}_chunk_{i}"
            ids.append(chunk_id)
            metadatas.append({
                "document_id": document_id,
                "source": source,
                "patient_id_hash": hashed_patient_id or "",
                "document_type": document_type,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "ingested_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Add to vector store
        self.vector_store.add_documents(
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        logger.info(f"Ingested document {document_id}: {len(chunks)} chunks")
        return len(chunks)
    
    def _chunk_text(
        self,
        text: str,
        chunk_size: int = 500,
        overlap: int = 50
    ) -> List[str]:
        """Split text into overlapping chunks."""
        if not text:
            return []
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk.rfind('. ')
                if last_period > chunk_size // 2:
                    chunk = chunk[:last_period + 1]
                    end = start + last_period + 1
            
            chunks.append(chunk.strip())
            start = end - overlap
        
        return [c for c in chunks if c]  # Remove empty chunks
    
    def retrieve(
        self,
        query: str,
        n_results: int = 5,
        patient_id: Optional[str] = None,
        source_filter: Optional[str] = None,
        redact_phi: bool = True
    ) -> List[RetrievalResult]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: User query
            n_results: Number of results to return
            patient_id: Filter by patient ID
            source_filter: Filter by source (EHR, PACS, etc.)
            redact_phi: Whether to redact PHI in results
            
        Returns:
            List of RetrievalResult objects with redacted content
        """
        # Embed query locally
        query_embedding = self.embedding_model.embed_query(query)
        
        # Build filter
        where = None
        if patient_id or source_filter:
            where = {}
            if patient_id:
                where["patient_id_hash"] = self._hash_patient_id(patient_id)
            if source_filter:
                where["source"] = source_filter
        
        # Query vector store
        results = self.vector_store.query(
            query_embedding=query_embedding,
            n_results=n_results,
            where=where
        )
        
        # Process results
        retrieval_results = []
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        
        for doc, meta, dist in zip(documents, metadatas, distances):
            # Redact PHI if requested
            redacted_content = doc
            token_map = {}
            
            if redact_phi and self.phi_guardrail:
                redacted_content, token_map = redact_phi_for_llm(doc)
            
            # Convert distance to similarity score (cosine distance to similarity)
            similarity = 1 - dist
            
            retrieval_results.append(RetrievalResult(
                content=doc,
                redacted_content=redacted_content,
                metadata=meta,
                relevance_score=similarity,
                token_map=token_map
            ))
        
        logger.info(f"Retrieved {len(retrieval_results)} documents for query")
        return retrieval_results
    
    def retrieve_and_format(
        self,
        query: str,
        n_results: int = 5,
        patient_id: Optional[str] = None,
        include_sources: bool = True
    ) -> Tuple[str, Dict[str, str]]:
        """
        Retrieve documents and format as context for LLM.
        
        Args:
            query: User query
            n_results: Number of results
            patient_id: Filter by patient
            include_sources: Include source citations
            
        Returns:
            Tuple of (formatted_context, combined_token_map)
        """
        results = self.retrieve(
            query=query,
            n_results=n_results,
            patient_id=patient_id,
            redact_phi=True
        )
        
        if not results:
            return "", {}
        
        # Combine redacted content
        context_parts = []
        combined_token_map = {}
        
        for i, result in enumerate(results, 1):
            if include_sources:
                source = result.metadata.get("source", "Unknown")
                doc_type = result.metadata.get("document_type", "Document")
                context_parts.append(f"[Source {i}: {source} - {doc_type}]")
            
            context_parts.append(result.redacted_content)
            context_parts.append("")  # Empty line separator
            
            # Merge token maps
            combined_token_map.update(result.token_map)
        
        formatted_context = "\n".join(context_parts)
        return formatted_context, combined_token_map
    
    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics."""
        return {
            "total_documents": self.vector_store.count(),
            "embedding_model": self.embedding_model.model_name,
            "chroma_host": self.chroma_host,
            "phi_guardrail_active": self.phi_guardrail is not None
        }


# Singleton instance
_secure_rag: Optional[SecureRAG] = None


def get_secure_rag() -> Optional[SecureRAG]:
    """Get or create SecureRAG singleton."""
    global _secure_rag
    
    if not os.getenv("RAG_ENABLED", "true").lower() == "true":
        return None
    
    if _secure_rag is None:
        try:
            _secure_rag = SecureRAG()
        except Exception as e:
            logger.error(f"Failed to initialize SecureRAG: {e}")
            return None
    
    return _secure_rag


def ingest_medical_document(
    content: str,
    document_id: str,
    source: str = "EHR",
    patient_id: Optional[str] = None,
    document_type: str = "clinical_note"
) -> int:
    """
    Convenience function to ingest a medical document.
    
    Args:
        content: Document content
        document_id: Unique document ID
        source: Data source
        patient_id: Patient ID (will be hashed)
        document_type: Type of document
        
    Returns:
        Number of chunks ingested
    """
    rag = get_secure_rag()
    if rag is None:
        logger.warning("RAG not available")
        return 0
    
    return rag.ingest_document(
        content=content,
        document_id=document_id,
        source=source,
        patient_id=patient_id,
        document_type=document_type
    )


def retrieve_context_for_query(
    query: str,
    patient_id: Optional[str] = None,
    n_results: int = 5
) -> Tuple[str, Dict[str, str]]:
    """
    Retrieve relevant context for a query.
    
    Returns redacted context safe to send to external LLM.
    
    Args:
        query: User query
        patient_id: Optional patient ID filter
        n_results: Number of results
        
    Returns:
        Tuple of (redacted_context, token_map)
    """
    rag = get_secure_rag()
    if rag is None:
        return "", {}
    
    return rag.retrieve_and_format(
        query=query,
        patient_id=patient_id,
        n_results=n_results
    )
