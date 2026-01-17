"""
Simple Conversation Memory Manager for Rady GenAI Agent
"""

import logging
from typing import Dict, List, Optional, Union
from datetime import datetime
from dataclasses import dataclass, field

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

logger = logging.getLogger(__name__)

MEMORY_AVAILABLE = True


@dataclass
class SimpleMessage:
    """Simple message class"""
    type: str  # 'human' or 'ai'
    content: str
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class SessionMetadata:
    """Session metadata for tracking user info"""
    session_id: str
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)


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
        self._session_metadata: Dict[str, SessionMetadata] = {}
        logger.info("MemoryManager initialized with simple storage")
    
    def get_memory(self, session_id: str = "default", user_email: str = None, user_role: str = None) -> SimpleMemory:
        """Get or create memory for a session."""
        if session_id not in self._sessions:
            self._sessions[session_id] = SimpleMemory()
            self._session_metadata[session_id] = SessionMetadata(
                session_id=session_id,
                user_email=user_email,
                user_role=user_role
            )
            logger.info(f"Created new memory for session: {session_id} (user: {user_email})")
        else:
            # Update last activity and user info if provided
            if session_id in self._session_metadata:
                self._session_metadata[session_id].last_activity = datetime.now()
                if user_email:
                    self._session_metadata[session_id].user_email = user_email
                if user_role:
                    self._session_metadata[session_id].user_role = user_role
        return self._sessions[session_id]
    
    def get_conversation_history(self, session_id: str) -> List[BaseMessage]:
        """Get conversation history for a session as LangChain messages."""
        if session_id not in self._sessions:
            return []
        messages = self._sessions[session_id].get_messages()
        return self._convert_to_langchain_messages(messages)
    
    def _convert_to_langchain_messages(self, messages: List[SimpleMessage]) -> List[BaseMessage]:
        """Convert SimpleMessage objects to LangChain message format."""
        result = []
        for msg in messages:
            if msg.type == "human":
                result.append(HumanMessage(content=msg.content))
            elif msg.type == "ai":
                result.append(AIMessage(content=msg.content))
        return result
    
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
        metadata = self._session_metadata.get(session_id)
        
        return {
            "session_id": session_id,
            "message_count": len(history),
            "user_email": metadata.user_email if metadata else None,
            "user_role": metadata.user_role if metadata else None,
            "created_at": metadata.created_at.isoformat() if metadata else None,
            "last_activity": metadata.last_activity.isoformat() if metadata else None,
        }
    
    def get_all_sessions(self) -> List[dict]:
        """Get information about all active sessions."""
        sessions = []
        for session_id in self._sessions.keys():
            info = self.get_session_info(session_id)
            if info:
                sessions.append(info)
        # Sort by last activity (most recent first)
        sessions.sort(key=lambda x: x.get("last_activity", ""), reverse=True)
        return sessions


def create_memory_manager(llm=None) -> MemoryManager:
    """Create memory manager instance."""
    return MemoryManager()
