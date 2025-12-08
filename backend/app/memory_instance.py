"""
Shared memory manager instance.
"""

from typing import Optional

_memory_manager = None
_memory_available = False


def get_memory_manager():
    """Get the global memory manager instance."""
    return _memory_manager


def is_memory_available() -> bool:
    """Check if memory manager is available."""
    return _memory_available and _memory_manager is not None


def set_memory_manager(manager, available: bool = True):
    """Set the global memory manager instance."""
    global _memory_manager, _memory_available
    _memory_manager = manager
    _memory_available = available
    print(f"Memory manager set: available={available}")
