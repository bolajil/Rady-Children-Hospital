"""
Conversation Memory Manager for Rady GenAI Agent

Provides multiple memory backends for maintaining conversation context:
- Buffer: Simple in-memory storage for short conversations
- Summary: Summarizes older messages for long conversations
- Redis: Persistent storage across server restarts
"""

import os
import logging
from typing import Optional, Dict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Try to import memory components
try:
    from langchain_community.chat_message_histories import RedisChatMessageHistory
    from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
    from langchain_openai import ChatOpenAI
    MEMORY_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Memory components not available: {e}")
    MEMORY_AVAILABLE = False


class MemoryManager:
    """
    Manages conversation memory across different backends.
    """
    
    def __init__(
        self,
        memory_type: str = "buffer",
        redis_url: Optional[str] = None,
        session_timeout: int = 3600,
        llm: Optional[any] = None
    ):
        """
        Initialize memory manager.
        
        Args:
            memory_type: Type of memory ('buffer', 'summary', or 'redis')
            redis_url: Redis connection URL (required for redis type)
            session_timeout: Session timeout in seconds
            llm: Language model for summary memory
        """
        self.memory_type = memory_type.lower()
        self.redis_url = redis_url
        self.session_timeout = session_timeout
        self.llm = llm
        
        # In-memory session store
        self._sessions: Dict[str, any] = {}
        self._session_timestamps: Dict[str, datetime] = {}
        
        logger.info(f"MemoryManager initialized with type: {self.memory_type}")
    
    def get_memory(self, session_id: str = "default") -> Optional[any]:
        """
        Get or create memory for a session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Memory object for the session
        """
        if not MEMORY_AVAILABLE:
            logger.warning("Memory components not available, returning None")
            return None
        
        # Clean up expired sessions
        self._cleanup_expired_sessions()
        
        # Check if session exists
        if session_id in self._sessions:
            self._session_timestamps[session_id] = datetime.now()
            return self._sessions[session_id]
        
        # Create new memory based on type
        memory = self._create_memory(session_id)
        
        if memory:
            self._sessions[session_id] = memory
            self._session_timestamps[session_id] = datetime.now()
            logger.info(f"Created new {self.memory_type} memory for session: {session_id}")
        
        return memory
    
    def _create_memory(self, session_id: str) -> Optional[any]:
        """Create memory based on configured type."""
        try:
            if self.memory_type == "redis":
                return self._create_redis_memory(session_id)
            elif self.memory_type == "summary":
                return self._create_summary_memory(session_id)
            else:  # Default to buffer
                return self._create_buffer_memory(session_id)
        except Exception as e:
            logger.error(f"Failed to create {self.memory_type} memory: {e}")
            # Fallback to buffer memory
            logger.info("Falling back to buffer memory")
            return self._create_buffer_memory(session_id)
    
    def _create_buffer_memory(self, session_id: str) -> any:
        """Create simple buffer memory."""
        return ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="output",
            input_key="input"
        )
    
    def _create_summary_memory(self, session_id: str) -> any:
        """Create summary-based memory."""
        if not self.llm:
            logger.warning("No LLM provided for summary memory, using buffer instead")
            return self._create_buffer_memory(session_id)
        
        return ConversationSummaryMemory(
            llm=self.llm,
            memory_key="chat_history",
            return_messages=True,
            output_key="output",
            input_key="input"
        )
    
    def _create_redis_memory(self, session_id: str) -> any:
        """Create Redis-backed memory."""
        if not self.redis_url:
            logger.warning("No Redis URL provided, using buffer memory instead")
            return self._create_buffer_memory(session_id)
        
        try:
            message_history = RedisChatMessageHistory(
                session_id=session_id,
                url=self.redis_url,
                ttl=self.session_timeout
            )
            
            return ConversationBufferMemory(
                chat_memory=message_history,
                memory_key="chat_history",
                return_messages=True,
                output_key="output",
                input_key="input"
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            logger.info("Falling back to buffer memory")
            return self._create_buffer_memory(session_id)
    
    def get_conversation_history(self, session_id: str = "default") -> list:
        """
        Get conversation history for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of messages in the conversation
        """
        memory = self.get_memory(session_id)
        if not memory:
            return []
        
        try:
            # Try to get messages from memory
            if hasattr(memory, 'chat_memory') and hasattr(memory.chat_memory, 'messages'):
                return memory.chat_memory.messages
            elif hasattr(memory, 'buffer'):
                return memory.buffer
            else:
                return []
        except Exception as e:
            logger.error(f"Failed to get conversation history: {e}")
            return []
    
    def clear_session(self, session_id: str = "default") -> bool:
        """
        Clear a session's memory.
        
        Args:
            session_id: Session to clear
            
        Returns:
            True if cleared successfully
        """
        try:
            if session_id in self._sessions:
                memory = self._sessions[session_id]
                if hasattr(memory, 'clear'):
                    memory.clear()
                del self._sessions[session_id]
                del self._session_timestamps[session_id]
                logger.info(f"Cleared session: {session_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to clear session {session_id}: {e}")
            return False
    
    def list_sessions(self) -> list:
        """
        List all active sessions.
        
        Returns:
            List of session IDs
        """
        self._cleanup_expired_sessions()
        return list(self._sessions.keys())
    
    def get_session_info(self, session_id: str) -> Optional[dict]:
        """
        Get information about a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with session info
        """
        if session_id not in self._sessions:
            return None
        
        history = self.get_conversation_history(session_id)
        timestamp = self._session_timestamps.get(session_id)
        
        return {
            "session_id": session_id,
            "message_count": len(history),
            "last_activity": timestamp.isoformat() if timestamp else None,
            "memory_type": self.memory_type
        }
    
    def _cleanup_expired_sessions(self):
        """Remove expired sessions."""
        now = datetime.now()
        expired = []
        
        for session_id, timestamp in self._session_timestamps.items():
            if now - timestamp > timedelta(seconds=self.session_timeout):
                expired.append(session_id)
        
        for session_id in expired:
            logger.info(f"Cleaning up expired session: {session_id}")
            self.clear_session(session_id)


# Initialize global memory manager
def create_memory_manager(llm: Optional[any] = None) -> MemoryManager:
    """
    Create memory manager from environment variables.
    
    Args:
        llm: Language model for summary memory
        
    Returns:
        Configured MemoryManager instance
    """
    memory_type = os.getenv("MEMORY_TYPE", "buffer")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    session_timeout = int(os.getenv("SESSION_TIMEOUT", "3600"))
    
    return MemoryManager(
        memory_type=memory_type,
        redis_url=redis_url,
        session_timeout=session_timeout,
        llm=llm
    )
