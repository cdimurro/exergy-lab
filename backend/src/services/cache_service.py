"""
Cache Service for External API Calls

Provides caching layer to reduce API calls and respect rate limits.
Uses PostgreSQL-backed caching with TTL support.
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from src.models import APICache
from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CacheService:
    """
    Service for caching external API responses.

    Features:
    - TTL-based expiration
    - Hit counting for analytics
    - Automatic cleanup of expired entries
    """

    def __init__(self, db: Session):
        """
        Initialize cache service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def _generate_cache_key(self, api_source: str, params: Dict[str, Any]) -> str:
        """
        Generate unique cache key from API source and parameters.

        Args:
            api_source: API identifier (e.g., 'arxiv', 'pubchem')
            params: Dictionary of query parameters

        Returns:
            SHA256 hash as cache key
        """
        # Sort params for consistent hashing
        sorted_params = json.dumps(params, sort_keys=True)
        content = f"{api_source}:{sorted_params}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(
        self,
        api_source: str,
        params: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached API response.

        Args:
            api_source: API identifier
            params: Query parameters

        Returns:
            Cached response data or None if not found/expired
        """
        cache_key = self._generate_cache_key(api_source, params)

        try:
            # Query cache
            cache_entry = self.db.query(APICache).filter(
                APICache.cache_key == cache_key
            ).first()

            if not cache_entry:
                logger.debug(f"Cache miss for {api_source}: {cache_key[:16]}...")
                return None

            # Check if expired
            if cache_entry.is_expired:
                logger.debug(f"Cache expired for {api_source}: {cache_key[:16]}...")
                # Delete expired entry
                self.db.delete(cache_entry)
                self.db.commit()
                return None

            # Update hit count and last accessed
            cache_entry.hit_count += 1
            cache_entry.last_accessed = datetime.utcnow()
            self.db.commit()

            logger.info(
                f"Cache hit for {api_source}: {cache_key[:16]}... "
                f"(hits: {cache_entry.hit_count})"
            )

            return cache_entry.response_data

        except Exception as e:
            logger.error(f"Cache retrieval error: {str(e)}")
            return None

    def set(
        self,
        api_source: str,
        params: Dict[str, Any],
        response_data: Dict[str, Any],
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """
        Store API response in cache.

        Args:
            api_source: API identifier
            params: Query parameters
            response_data: API response to cache
            ttl_seconds: Time-to-live in seconds (default from config)

        Returns:
            True if successfully cached, False otherwise
        """
        cache_key = self._generate_cache_key(api_source, params)

        # Determine TTL based on API source
        if ttl_seconds is None:
            ttl_map = {
                'arxiv': settings.arxiv_cache_ttl,
                'pubchem': settings.pubchem_cache_ttl,
                'materials_project': settings.materials_cache_ttl,
            }
            ttl_seconds = ttl_map.get(api_source, 86400)  # Default 1 day

        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)

        try:
            # Check if entry already exists
            existing = self.db.query(APICache).filter(
                APICache.cache_key == cache_key
            ).first()

            if existing:
                # Update existing entry
                existing.response_data = response_data
                existing.expires_at = expires_at
                existing.created_at = datetime.utcnow()
                existing.hit_count = 0  # Reset hit count
                logger.debug(f"Updated cache entry for {api_source}: {cache_key[:16]}...")
            else:
                # Create new entry
                cache_entry = APICache(
                    cache_key=cache_key,
                    api_source=api_source,
                    response_data=response_data,
                    expires_at=expires_at
                )
                self.db.add(cache_entry)
                logger.debug(f"Created cache entry for {api_source}: {cache_key[:16]}...")

            self.db.commit()
            return True

        except Exception as e:
            logger.error(f"Cache storage error: {str(e)}")
            self.db.rollback()
            return False

    def invalidate(self, api_source: str, params: Dict[str, Any]) -> bool:
        """
        Invalidate (delete) a specific cache entry.

        Args:
            api_source: API identifier
            params: Query parameters

        Returns:
            True if entry was deleted, False otherwise
        """
        cache_key = self._generate_cache_key(api_source, params)

        try:
            result = self.db.query(APICache).filter(
                APICache.cache_key == cache_key
            ).delete()
            self.db.commit()

            if result > 0:
                logger.info(f"Invalidated cache for {api_source}: {cache_key[:16]}...")
                return True
            return False

        except Exception as e:
            logger.error(f"Cache invalidation error: {str(e)}")
            self.db.rollback()
            return False

    def cleanup_expired(self) -> int:
        """
        Remove all expired cache entries.

        Returns:
            Number of entries deleted
        """
        try:
            result = self.db.query(APICache).filter(
                APICache.expires_at < datetime.utcnow()
            ).delete()
            self.db.commit()

            if result > 0:
                logger.info(f"Cleaned up {result} expired cache entries")

            return result

        except Exception as e:
            logger.error(f"Cache cleanup error: {str(e)}")
            self.db.rollback()
            return 0

    def get_stats(self, api_source: Optional[str] = None) -> Dict[str, Any]:
        """
        Get cache statistics.

        Args:
            api_source: Optional filter by API source

        Returns:
            Dictionary with cache statistics
        """
        try:
            query = self.db.query(APICache)

            if api_source:
                query = query.filter(APICache.api_source == api_source)

            total_entries = query.count()
            expired_entries = query.filter(
                APICache.expires_at < datetime.utcnow()
            ).count()

            total_hits = sum(
                entry.hit_count for entry in query.all()
            )

            return {
                "total_entries": total_entries,
                "active_entries": total_entries - expired_entries,
                "expired_entries": expired_entries,
                "total_hits": total_hits,
                "api_source": api_source or "all"
            }

        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {"error": str(e)}


def get_cache_service(db: Session) -> CacheService:
    """Factory function to get cache service instance."""
    return CacheService(db)
