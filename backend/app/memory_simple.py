"""
Simple Conversation Memory Manager for Rady GenAI Agent
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

MEMORY_AVAILABLE = True


@dataclass
class SimpleMessage:
    """Simple message class"""
    type: str  # 'human' or 'ai'
    content: str
    timestamp: datetime = field(default_factory=datetime.now)


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
    """Manages conversation memory with simple in-memory storage."""
    
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
    
    def get_session_info(self, session_id: str) -> Optional[dict]:
        """Get information about a session."""
        if session_id not in self._sessions:
            return None
        
        history = self.get_conversation_history(session_id)
        return {
            "session_id": session_id,
            "message_count": len(history),
        }


def create_memory_manager(llm=None) -> MemoryManager:
    """Create memory manager instance."""
    return MemoryManager()
