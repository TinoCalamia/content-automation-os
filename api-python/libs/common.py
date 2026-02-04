"""Common utilities shared across the backend."""

import re
from typing import Any, Optional, List, Dict
from urllib.parse import urlparse


def detect_source_type(input_text: str) -> str:
    """
    Detect the type of source from input text.
    
    Args:
        input_text: URL or text content
        
    Returns:
        Source type string
    """
    input_text = input_text.strip()
    
    # Check if it's a URL
    if input_text.startswith(("http://", "https://")):
        parsed = urlparse(input_text)
        domain = parsed.netloc.lower()
        
        # LinkedIn
        if "linkedin.com" in domain:
            return "linkedin_url"
        
        # YouTube
        if "youtube.com" in domain or "youtu.be" in domain:
            return "youtube_url"
        
        # X/Twitter
        if "twitter.com" in domain or "x.com" in domain:
            return "x_url"
        
        # Default to blog/article URL
        return "blog_url"
    
    # Not a URL, treat as note
    return "note"


def extract_youtube_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats.
    
    Args:
        url: YouTube URL
        
    Returns:
        Video ID or None if not found
    """
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def clean_text(text: str) -> str:
    """
    Clean text by removing extra whitespace and normalizing.
    
    Args:
        text: Raw text
        
    Returns:
        Cleaned text
    """
    # Remove multiple newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove multiple spaces
    text = re.sub(r" {2,}", " ", text)
    # Strip lines
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    return text.strip()


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate text to max length, preserving word boundaries.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to add if truncated
        
    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text
    
    truncated = text[: max_length - len(suffix)]
    # Find last space
    last_space = truncated.rfind(" ")
    if last_space > max_length // 2:
        truncated = truncated[:last_space]
    
    return truncated + suffix


def extract_hashtags(text: str) -> List[str]:
    """
    Extract hashtags from text.
    
    Args:
        text: Text containing hashtags
        
    Returns:
        List of hashtags (without #)
    """
    pattern = r"#(\w+)"
    return re.findall(pattern, text)


def format_hashtags(tags: List[str], max_count: int = 5) -> str:
    """
    Format hashtags for social media posts.
    
    Args:
        tags: List of tag strings
        max_count: Maximum number of hashtags
        
    Returns:
        Formatted hashtag string
    """
    # Clean and dedupe
    clean_tags = []
    seen = set()
    for tag in tags:
        tag = tag.strip().lower().replace(" ", "")
        if tag and tag not in seen:
            clean_tags.append(tag)
            seen.add(tag)
    
    # Limit and format
    return " ".join(f"#{tag}" for tag in clean_tags[:max_count])


def safe_get(data: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    """
    Safely get nested dictionary values.
    
    Args:
        data: Dictionary to traverse
        keys: Keys to follow
        default: Default value if not found
        
    Returns:
        Value at path or default
    """
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current
