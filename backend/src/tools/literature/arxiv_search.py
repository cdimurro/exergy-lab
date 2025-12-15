"""
arXiv Search Tool

Searches the arXiv API for academic papers with caching and retry logic.

API Documentation: https://info.arxiv.org/help/api/index.html
Rate Limit: 1 request per 3 seconds (enforced by API)
"""

import logging
import time
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from datetime import datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from sqlalchemy.orm import Session

from src.services.cache_service import CacheService
from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ArxivSearchTool:
    """
    Tool for searching arXiv papers.

    Features:
    - Automatic retry on network errors
    - Rate limiting (1 req/3s)
    - Response caching (7 day TTL)
    - XML parsing with error handling
    """

    BASE_URL = "http://export.arxiv.org/api/query"
    RATE_LIMIT_DELAY = 3  # seconds between requests

    def __init__(self, db: Optional[Session] = None):
        """
        Initialize arXiv search tool.

        Args:
            db: Optional database session for caching
        """
        self.db = db
        self.cache = CacheService(db) if db else None
        self.last_request_time = 0

    def _enforce_rate_limit(self):
        """Enforce arXiv rate limit of 1 request per 3 seconds."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.RATE_LIMIT_DELAY:
            sleep_time = self.RATE_LIMIT_DELAY - time_since_last
            logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException))
    )
    def _make_request(self, params: Dict[str, Any]) -> str:
        """
        Make HTTP request to arXiv API with retry logic.

        Args:
            params: Query parameters

        Returns:
            XML response as string

        Raises:
            httpx.HTTPError: If request fails after retries
        """
        self._enforce_rate_limit()

        try:
            response = httpx.get(
                self.BASE_URL,
                params=params,
                timeout=30.0,
                follow_redirects=True
            )
            response.raise_for_status()
            return response.text

        except httpx.HTTPError as e:
            logger.error(f"arXiv API request failed: {str(e)}")
            raise

    def _parse_xml_response(self, xml_content: str) -> List[Dict[str, Any]]:
        """
        Parse arXiv XML response into structured data.

        Args:
            xml_content: XML response from arXiv API

        Returns:
            List of paper dictionaries
        """
        try:
            root = ET.fromstring(xml_content)

            # Define XML namespaces
            ns = {
                'atom': 'http://www.w3.org/2005/Atom',
                'arxiv': 'http://arxiv.org/schemas/atom'
            }

            papers = []

            for entry in root.findall('atom:entry', ns):
                try:
                    # Extract paper data
                    paper = {
                        'id': self._get_text(entry, 'atom:id', ns),
                        'title': self._get_text(entry, 'atom:title', ns).strip(),
                        'summary': self._get_text(entry, 'atom:summary', ns).strip(),
                        'published': self._get_text(entry, 'atom:published', ns),
                        'updated': self._get_text(entry, 'atom:updated', ns),
                        'authors': self._extract_authors(entry, ns),
                        'categories': self._extract_categories(entry, ns),
                        'pdf_url': self._extract_pdf_url(entry, ns),
                        'arxiv_id': self._extract_arxiv_id(entry, ns)
                    }

                    papers.append(paper)

                except Exception as e:
                    logger.warning(f"Failed to parse paper entry: {str(e)}")
                    continue

            logger.info(f"Parsed {len(papers)} papers from arXiv response")
            return papers

        except ET.ParseError as e:
            logger.error(f"Failed to parse XML: {str(e)}")
            return []

    def _get_text(self, element: ET.Element, path: str, ns: Dict) -> str:
        """Safely extract text from XML element."""
        found = element.find(path, ns)
        return found.text if found is not None and found.text else ""

    def _extract_authors(self, entry: ET.Element, ns: Dict) -> List[str]:
        """Extract author names from entry."""
        authors = []
        for author in entry.findall('atom:author', ns):
            name_elem = author.find('atom:name', ns)
            if name_elem is not None and name_elem.text:
                authors.append(name_elem.text.strip())
        return authors

    def _extract_categories(self, entry: ET.Element, ns: Dict) -> List[str]:
        """Extract category tags from entry."""
        categories = []
        for category in entry.findall('atom:category', ns):
            term = category.get('term')
            if term:
                categories.append(term)
        return categories

    def _extract_pdf_url(self, entry: ET.Element, ns: Dict) -> Optional[str]:
        """Extract PDF URL from entry."""
        for link in entry.findall('atom:link', ns):
            if link.get('title') == 'pdf':
                return link.get('href')
        return None

    def _extract_arxiv_id(self, entry: ET.Element, ns: Dict) -> Optional[str]:
        """Extract arXiv ID from entry ID URL."""
        id_text = self._get_text(entry, 'atom:id', ns)
        if id_text:
            # Extract ID from URL like http://arxiv.org/abs/2301.12345v1
            parts = id_text.split('/')
            if parts:
                return parts[-1]  # e.g., "2301.12345v1"
        return None

    def search(
        self,
        query: str,
        max_results: int = 10,
        sort_by: str = "relevance",
        sort_order: str = "descending"
    ) -> List[Dict[str, Any]]:
        """
        Search arXiv for papers matching query.

        Args:
            query: Search query (supports boolean operators, field searches)
            max_results: Maximum number of results to return (default 10)
            sort_by: Sort criterion (relevance, lastUpdatedDate, submittedDate)
            sort_order: Sort order (ascending, descending)

        Returns:
            List of paper dictionaries with metadata

        Example:
            >>> tool = ArxivSearchTool()
            >>> papers = tool.search("perovskite solar cell", max_results=5)
            >>> print(f"Found {len(papers)} papers")
        """
        # Validate parameters
        max_results = min(max_results, settings.max_arxiv_results)

        params = {
            'search_query': query,
            'start': 0,
            'max_results': max_results,
            'sortBy': sort_by,
            'sortOrder': sort_order
        }

        # Check cache first
        if self.cache:
            cached_response = self.cache.get('arxiv', params)
            if cached_response:
                logger.info(f"Returning cached arXiv results for: {query}")
                return cached_response.get('papers', [])

        # Make request to arXiv API
        try:
            logger.info(f"Searching arXiv for: {query} (max_results={max_results})")
            xml_content = self._make_request(params)

            # Parse response
            papers = self._parse_xml_response(xml_content)

            # Cache results
            if self.cache and papers:
                response_data = {
                    'query': query,
                    'papers': papers,
                    'retrieved_at': datetime.utcnow().isoformat()
                }
                self.cache.set('arxiv', params, response_data)

            logger.info(f"Found {len(papers)} papers for query: {query}")
            return papers

        except Exception as e:
            logger.error(f"arXiv search failed for query '{query}': {str(e)}")
            return []

    def search_by_category(
        self,
        category: str,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search arXiv by category code.

        Args:
            category: arXiv category (e.g., 'cond-mat.mtrl-sci', 'physics.chem-ph')
            max_results: Maximum results to return

        Returns:
            List of papers in category

        Categories:
        - cond-mat.mtrl-sci: Materials Science
        - physics.chem-ph: Chemical Physics
        - physics.app-ph: Applied Physics
        """
        query = f"cat:{category}"
        return self.search(query, max_results=max_results, sort_by="submittedDate")

    def search_by_author(
        self,
        author: str,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search arXiv by author name.

        Args:
            author: Author name
            max_results: Maximum results

        Returns:
            List of papers by author
        """
        query = f"au:{author}"
        return self.search(query, max_results=max_results, sort_by="submittedDate")


# Convenience function for direct usage
def search_arxiv(
    query: str,
    max_results: int = 10,
    db: Optional[Session] = None
) -> List[Dict[str, Any]]:
    """
    Convenience function to search arXiv.

    Args:
        query: Search query
        max_results: Maximum results
        db: Optional database session for caching

    Returns:
        List of papers
    """
    tool = ArxivSearchTool(db=db)
    return tool.search(query, max_results=max_results)
