"""
IP Rate Limiter for Anonymous Users
====================================

Limits anonymous users to 2 free analyses per IP address.
Integrates with Supabase for persistent storage.

Author: Mastering Ready
Version: 1.0.0
"""

import os
import hashlib
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# Feature flag - enabled by default for security (set to 'false' to disable)
ENABLE_IP_RATE_LIMIT = os.getenv('ENABLE_IP_RATE_LIMIT', 'true').lower() == 'true'

# Maximum free analyses per IP
MAX_FREE_ANALYSES_PER_IP = 3


def hash_ip(ip_address: str) -> str:
    """
    Create SHA-256 hash of IP address for privacy-preserving storage.

    Args:
        ip_address: Raw IP address

    Returns:
        SHA-256 hash of the IP
    """
    return hashlib.sha256(ip_address.encode()).hexdigest()


def get_client_ip(request) -> str:
    """
    Extract real client IP from request, handling proxies and load balancers.

    Priority:
    1. CF-Connecting-IP (Cloudflare)
    2. X-Real-IP (Nginx)
    3. X-Forwarded-For (first IP)
    4. client.host (direct connection)

    Args:
        request: FastAPI Request object

    Returns:
        Client IP address string
    """
    # Cloudflare
    cf_ip = request.headers.get('CF-Connecting-IP')
    if cf_ip:
        return cf_ip.strip()

    # Nginx proxy
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip.strip()

    # Standard proxy header (take first IP in chain)
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        # X-Forwarded-For can be: "client, proxy1, proxy2"
        return forwarded.split(',')[0].strip()

    # Direct connection
    if request.client and request.client.host:
        return request.client.host

    return '0.0.0.0'


class IPLimiter:
    """
    IP-based rate limiter for anonymous users.

    Uses Supabase for persistent storage or in-memory fallback.
    """

    def __init__(self, supabase_client=None):
        """
        Initialize the IP limiter.

        Args:
            supabase_client: Optional Supabase client for persistent storage
        """
        self.supabase = supabase_client
        self._memory_store: Dict[str, Dict[str, Any]] = {}
        self.enabled = ENABLE_IP_RATE_LIMIT

        logger.info(f"IPLimiter initialized. Enabled: {self.enabled}")

    def is_enabled(self) -> bool:
        """Check if IP rate limiting is enabled."""
        return self.enabled

    async def check_ip_limit(
        self,
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Check if IP address has exceeded free analysis limit.

        Args:
            ip_address: Client IP address
            user_agent: Optional user agent string

        Returns:
            Tuple of (can_analyze, message, details)
            - can_analyze: True if user can perform analysis
            - message: Status message (OK, LIMIT_REACHED, VPN_DETECTED, DISABLED)
            - details: Additional info dict
        """
        # If disabled, always allow
        if not self.enabled:
            return True, 'DISABLED', {'reason': 'IP rate limiting is disabled'}

        ip_hash = hash_ip(ip_address)

        # Try Supabase first
        if self.supabase:
            try:
                result = self.supabase.rpc(
                    'check_ip_limit',
                    {'p_ip_hash': ip_hash}
                ).execute()

                if result.data and len(result.data) > 0:
                    row = result.data[0]
                    return (
                        row['can_analyze'],
                        row['message'],
                        {
                            'analyses_used': row['analyses_used'],
                            'is_vpn': row['is_vpn'],
                            'ip_hash': ip_hash[:8] + '...'  # Partial hash for logging
                        }
                    )
            except Exception as e:
                logger.warning(f"Supabase check failed, using memory store: {e}")

        # Fallback to in-memory store
        return self._check_memory_limit(ip_hash)

    def _check_memory_limit(self, ip_hash: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Check limit using in-memory store (fallback).

        Args:
            ip_hash: Hashed IP address

        Returns:
            Tuple of (can_analyze, message, details)
        """
        session = self._memory_store.get(ip_hash)

        if not session:
            return True, 'OK', {'analyses_used': 0, 'is_vpn': False}

        if session.get('is_vpn'):
            return False, 'VPN_DETECTED', {
                'analyses_used': session.get('count', 0),
                'is_vpn': True
            }

        if session.get('count', 0) >= MAX_FREE_ANALYSES_PER_IP:
            return False, 'LIMIT_REACHED', {
                'analyses_used': session.get('count', 0),
                'is_vpn': False
            }

        return True, 'OK', {
            'analyses_used': session.get('count', 0),
            'is_vpn': False
        }

    async def record_analysis(
        self,
        ip_address: str,
        user_agent: Optional[str] = None,
        vpn_info: Optional[Dict[str, Any]] = None,
        geo_info: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record that an analysis was performed from this IP.

        Args:
            ip_address: Client IP address
            user_agent: Optional user agent string
            vpn_info: Optional VPN detection results
            geo_info: Optional geolocation info

        Returns:
            True if recorded successfully
        """
        if not self.enabled:
            return True

        ip_hash = hash_ip(ip_address)
        vpn_info = vpn_info or {}
        geo_info = geo_info or {}

        # Try Supabase first
        if self.supabase:
            try:
                self.supabase.rpc(
                    'record_anonymous_analysis',
                    {
                        'p_ip_address': ip_address,
                        'p_ip_hash': ip_hash,
                        'p_user_agent': user_agent,
                        'p_is_vpn': vpn_info.get('is_vpn', False),
                        'p_is_proxy': vpn_info.get('is_proxy', False),
                        'p_is_tor': vpn_info.get('is_tor', False),
                        'p_vpn_service': vpn_info.get('service_name'),
                        'p_country': geo_info.get('country'),
                        'p_region': geo_info.get('region'),
                        'p_city': geo_info.get('city')
                    }
                ).execute()

                logger.info(f"Recorded analysis for IP hash: {ip_hash[:8]}...")
                return True

            except Exception as e:
                logger.warning(f"Supabase record failed, using memory store: {e}")

        # Fallback to in-memory store
        return self._record_memory(ip_hash, vpn_info)

    def _record_memory(self, ip_hash: str, vpn_info: Dict[str, Any]) -> bool:
        """
        Record analysis in memory store (fallback).

        Args:
            ip_hash: Hashed IP address
            vpn_info: VPN detection info

        Returns:
            True if recorded
        """
        if ip_hash not in self._memory_store:
            self._memory_store[ip_hash] = {
                'count': 0,
                'first_analysis': datetime.now(),
                'is_vpn': vpn_info.get('is_vpn', False)
            }

        self._memory_store[ip_hash]['count'] = self._memory_store[ip_hash].get('count', 0) + 1
        self._memory_store[ip_hash]['last_analysis'] = datetime.now()

        logger.info(f"Recorded analysis (memory) for IP hash: {ip_hash[:8]}...")
        return True


# Global instance (will be initialized with Supabase client in main.py)
ip_limiter: Optional[IPLimiter] = None


def init_ip_limiter(supabase_client=None) -> IPLimiter:
    """
    Initialize the global IP limiter instance.

    Args:
        supabase_client: Optional Supabase client

    Returns:
        IPLimiter instance
    """
    global ip_limiter
    ip_limiter = IPLimiter(supabase_client)
    return ip_limiter


def get_ip_limiter() -> Optional[IPLimiter]:
    """Get the global IP limiter instance."""
    return ip_limiter
