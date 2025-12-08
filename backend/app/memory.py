"""
Conversation Memory Manager for Rady GenAI Agent

Simple in-memory storage for conversation history.
"""

import logging
from typing import Optional, Dict, List
from datetime import datetime
from dataclasses import dataclass

logger = logging.getLogger(__name__)

MEMORY_AVAILABLE = True  # Always available with simple storage


@dataclass
class SimpleMessage:
    """Simple message class"""
    type: str  # 'human' or 'ai'
    content: str
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class SimpleMemory:
    """Simple in-memory conversation buffer"""
    def __init__(self):
        self.messages: List[SimpleMessage] = []
    
    def save_context(self, inputs: dict, outputs: dict):
        """Save a conversation turn"""
        if "input" in inputs:
            self.messages.append(SimpleMessage(type="human", content=inputs["input"]))
        if "output" in outputs:
            self.messages.append(SimpleMessage(type="ai", content=outputs["output"]))
    
    def get_messages(self) -> List[SimpleMessage]:
        return self.messages
    
    def clear(self):
        self.messages = []


class MemoryManager:
    """
    Manages conversation memory with simple in-memory storage.
    """
    
    def __init__(self, **kwargs):
        """Initialize memory manager."""
        self._sessions: Dict[str, SimpleMemory] = {}
        logger.info("MemoryManager initialized with simple storage")
    
    def get_memory(self, session_id: str = "default") -> SimpleMemory:
        """Get or create memory for a session."""
        if session_id not in self._sessions:
            self._sessions[session_id] = SimpleMemory()
            logger.info(f"Created new memory for session: {session_id}")
        return self._sessions[session_id]
    
    def get_conversation_history(self, session_id: str) -> List[SimpleMessage]:
        """Get conversation history for a session."""
        if session_id not in self._sessions:
            return []
        return self._sessions[session_id].get_messages()
    
    def list_sessions(self) -> List[str]:
        """List all active sessions."""
        return list(self._sessions.keys())
    
    def clear_session(self, session_id: str) -> bool:
        """Clear a session's memory."""
        if session_id in self._sessions:
            self._sessions[session_id].clear()
            return True
        return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session entirely."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False
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
