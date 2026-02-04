"""Content enrichment service for extracting and summarizing source content."""

import httpx
from typing import Any, Optional, Dict
from bs4 import BeautifulSoup

from libs.setup import setup_logging, get_settings
from libs.common import (
    detect_source_type,
    extract_youtube_video_id,
    clean_text,
    truncate_text,
)

logger = setup_logging(__name__)


class EnrichmentService:
    """Service for enriching source content with metadata and summaries."""
    
    def __init__(self, gemini_client: Optional[Any] = None):
        """
        Initialize the enrichment service.
        
        Args:
            gemini_client: Optional Gemini client for AI summarization
        """
        self.gemini_client = gemini_client
        self.settings = get_settings()
    
    async def enrich_source(self, source_type: str, url: Optional[str], raw_text: Optional[str]) -> Dict[str, Any]:
        """
        Enrich a source with metadata and AI-generated summary.
        
        Args:
            source_type: Type of source (linkedin_url, youtube_url, etc.)
            url: Source URL (if applicable)
            raw_text: Raw text content (if note or already extracted)
            
        Returns:
            Dictionary with enriched data
        """
        result = {
            "title": None,
            "author": None,
            "published_at": None,
            "thumbnail_url": None,
            "raw_text": raw_text,
            "cleaned_text": None,
            "summary": None,
            "key_points": None,
        }
        
        try:
            # Extract content based on type
            if source_type == "youtube_url" and url:
                extracted = await self._extract_youtube(url)
                result.update(extracted)
            elif source_type in ["linkedin_url", "x_url", "blog_url"] and url:
                extracted = await self._extract_webpage(url)
                result.update(extracted)
            elif source_type == "note" and raw_text:
                result["cleaned_text"] = clean_text(raw_text)
            
            # Generate summary and key points if we have content
            content = result.get("cleaned_text") or result.get("raw_text")
            if content and self.gemini_client:
                summary_data = await self._generate_summary(content)
                result["summary"] = summary_data.get("summary")
                result["key_points"] = summary_data.get("key_points")
            
        except Exception as e:
            logger.error(f"Error enriching source: {e}", exc_info=True)
        
        return result
    
    async def _extract_youtube(self, url: str) -> Dict[str, Any]:
        """Extract content from YouTube video."""
        result = {}
        video_id = extract_youtube_video_id(url)
        
        if not video_id:
            return result
        
        # Try to get transcript
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_transcript = " ".join([entry["text"] for entry in transcript_list])
            result["raw_text"] = full_transcript
            result["cleaned_text"] = clean_text(full_transcript)
        except Exception as e:
            logger.warning(f"Could not get YouTube transcript: {e}")
        
        # Get video metadata via oEmbed
        try:
            async with httpx.AsyncClient() as client:
                oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
                response = await client.get(oembed_url)
                if response.status_code == 200:
                    data = response.json()
                    result["title"] = data.get("title")
                    result["author"] = data.get("author_name")
                    result["thumbnail_url"] = data.get("thumbnail_url")
        except Exception as e:
            logger.warning(f"Could not get YouTube metadata: {e}")
        
        return result
    
    async def _extract_webpage(self, url: str) -> Dict[str, Any]:
        """Extract content from a webpage."""
        result = {}
        
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
                response = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; ContentBot/1.0)"
                })
                
                if response.status_code != 200:
                    return result
                
                soup = BeautifulSoup(response.text, "lxml")
                
                # Extract title
                title_tag = soup.find("title")
                if title_tag:
                    result["title"] = title_tag.get_text().strip()
                
                # Try Open Graph tags
                og_title = soup.find("meta", property="og:title")
                if og_title and og_title.get("content"):
                    result["title"] = og_title["content"]
                
                og_image = soup.find("meta", property="og:image")
                if og_image and og_image.get("content"):
                    result["thumbnail_url"] = og_image["content"]
                
                # Extract author
                author_meta = soup.find("meta", attrs={"name": "author"})
                if author_meta and author_meta.get("content"):
                    result["author"] = author_meta["content"]
                
                # Extract main content
                # Try article tag first
                article = soup.find("article")
                if article:
                    # Remove script and style elements
                    for element in article(["script", "style", "nav", "aside"]):
                        element.decompose()
                    text = article.get_text(separator="\n")
                else:
                    # Fall back to body
                    body = soup.find("body")
                    if body:
                        for element in body(["script", "style", "nav", "aside", "header", "footer"]):
                            element.decompose()
                        text = body.get_text(separator="\n")
                    else:
                        text = soup.get_text(separator="\n")
                
                result["raw_text"] = text
                result["cleaned_text"] = clean_text(text)
                
        except Exception as e:
            logger.error(f"Error extracting webpage: {e}", exc_info=True)
        
        return result
    
    async def _generate_summary(self, content: str) -> Dict[str, Any]:
        """Generate summary and key points using Gemini."""
        if not self.gemini_client:
            return {}
        
        # Truncate very long content
        content = truncate_text(content, 15000)
        
        prompt = f"""Analyze the following content and provide:
1. A concise summary (2-3 sentences max)
2. 3-5 key points or takeaways as bullet points

Content:
{content}

Respond in this exact JSON format:
{{
    "summary": "Your summary here",
    "key_points": ["Point 1", "Point 2", "Point 3"]
}}"""

        try:
            response = self.gemini_client.generate_content(prompt)
            # Parse JSON from response
            import json
            # Try to extract JSON from response
            text = response.text
            # Find JSON in response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
        except Exception as e:
            logger.error(f"Error generating summary: {e}", exc_info=True)
        
        return {}
