"""
VPN/Proxy Detection Module
===========================

Detects VPNs, proxies, and Tor exit nodes using multiple methods.
Uses free APIs with optional premium service support.

Author: Mastering Ready
Version: 1.0.0
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Feature flag - VPN detection can be disabled separately
ENABLE_VPN_DETECTION = os.getenv('ENABLE_VPN_DETECTION', 'true').lower() == 'true'

# API Keys (optional - free tier works without)
IPINFO_TOKEN = os.getenv('IPINFO_TOKEN', '')  # ipinfo.io
VPNAPI_KEY = os.getenv('VPNAPI_KEY', '')      # vpnapi.io

# Cache for VPN checks (to avoid repeated API calls)
_vpn_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl = timedelta(hours=24)


class VPNDetector:
    """
    Detects VPNs, proxies, and Tor nodes.

    Uses multiple detection methods:
    1. Known VPN/datacenter IP ranges
    2. Free IP reputation APIs
    3. Hostname analysis
    """

    def __init__(self):
        """Initialize the VPN detector."""
        self.enabled = ENABLE_VPN_DETECTION

        # Known datacenter/VPN ASN prefixes (common VPN providers)
        self.vpn_asn_keywords = [
            'digitalocean', 'linode', 'vultr', 'aws', 'amazon',
            'google cloud', 'microsoft azure', 'ovh', 'hetzner',
            'expressvpn', 'nordvpn', 'surfshark', 'protonvpn',
            'mullvad', 'private internet access', 'cyberghost',
            'ipvanish', 'hotspot shield', 'tunnelbear'
        ]

        # Known VPN/proxy hostname patterns
        self.vpn_hostname_patterns = [
            'vpn', 'proxy', 'tor', 'exit', 'relay',
            'datacenter', 'hosting', 'server', 'cloud',
            'vps', 'dedicated'
        ]

        logger.info(f"VPNDetector initialized. Enabled: {self.enabled}")

    def is_enabled(self) -> bool:
        """Check if VPN detection is enabled."""
        return self.enabled

    async def detect(self, ip_address: str) -> Dict[str, Any]:
        """
        Detect if IP is a VPN, proxy, or Tor exit node.

        Args:
            ip_address: IP address to check

        Returns:
            Dict with detection results:
            {
                'is_vpn': bool,
                'is_proxy': bool,
                'is_tor': bool,
                'is_datacenter': bool,
                'confidence': float (0-1),
                'service_name': str or None,
                'detection_method': str,
                'details': dict
            }
        """
        # Default result (not detected)
        result = {
            'is_vpn': False,
            'is_proxy': False,
            'is_tor': False,
            'is_datacenter': False,
            'confidence': 0.0,
            'service_name': None,
            'detection_method': 'none',
            'details': {},
            'checked_at': datetime.now().isoformat()
        }

        # If disabled, return default
        if not self.enabled:
            result['detection_method'] = 'disabled'
            return result

        # Check cache first
        cached = self._get_cached(ip_address)
        if cached:
            logger.info(f"VPN check cache hit for {ip_address[:8]}...")
            return cached

        # Skip detection for localhost/private IPs
        if self._is_private_ip(ip_address):
            result['detection_method'] = 'private_ip'
            return result

        # Try multiple detection methods
        try:
            # Method 1: Free ipapi.co (no key required, 1000/day)
            ipapi_result = await self._check_ipapi(ip_address)
            if ipapi_result:
                result.update(ipapi_result)
                if result['is_vpn'] or result['is_proxy'] or result['is_tor']:
                    self._cache_result(ip_address, result)
                    return result

            # Method 2: ipinfo.io (if token available)
            if IPINFO_TOKEN:
                ipinfo_result = await self._check_ipinfo(ip_address)
                if ipinfo_result:
                    result.update(ipinfo_result)
                    if result['is_vpn'] or result['is_proxy']:
                        self._cache_result(ip_address, result)
                        return result

            # Method 3: Heuristic checks
            heuristic_result = self._heuristic_check(result.get('details', {}))
            if heuristic_result['is_vpn']:
                result.update(heuristic_result)

        except Exception as e:
            logger.warning(f"VPN detection error for {ip_address}: {e}")
            result['details']['error'] = str(e)

        # Cache and return
        self._cache_result(ip_address, result)
        return result

    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is private/localhost."""
        private_prefixes = [
            '10.', '172.16.', '172.17.', '172.18.', '172.19.',
            '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
            '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
            '172.30.', '172.31.', '192.168.', '127.', '0.', 'localhost'
        ]
        return any(ip.startswith(prefix) for prefix in private_prefixes)

    async def _check_ipapi(self, ip: str) -> Optional[Dict[str, Any]]:
        """
        Check IP using ipapi.co (free, 1000 requests/day).

        Args:
            ip: IP address

        Returns:
            Detection result or None
        """
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f'https://ipapi.co/{ip}/json/',
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Check for VPN/proxy indicators
                        org = (data.get('org') or '').lower()
                        asn = (data.get('asn') or '').lower()

                        # Check against known VPN providers
                        is_datacenter = any(
                            kw in org or kw in asn
                            for kw in self.vpn_asn_keywords
                        )

                        return {
                            'is_datacenter': is_datacenter,
                            'is_vpn': is_datacenter,  # Conservative: assume datacenter = VPN
                            'confidence': 0.6 if is_datacenter else 0.0,
                            'service_name': org if is_datacenter else None,
                            'detection_method': 'ipapi_asn',
                            'details': {
                                'org': data.get('org'),
                                'asn': data.get('asn'),
                                'country': data.get('country_code'),
                                'region': data.get('region'),
                                'city': data.get('city')
                            }
                        }
        except Exception as e:
            logger.debug(f"ipapi.co check failed: {e}")

        return None

    async def _check_ipinfo(self, ip: str) -> Optional[Dict[str, Any]]:
        """
        Check IP using ipinfo.io (requires token for privacy detection).

        Args:
            ip: IP address

        Returns:
            Detection result or None
        """
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f'https://ipinfo.io/{ip}/json',
                    headers={'Authorization': f'Bearer {IPINFO_TOKEN}'},
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        data = await response.json()

                        # ipinfo.io privacy detection (requires paid plan)
                        privacy = data.get('privacy', {})

                        is_vpn = privacy.get('vpn', False)
                        is_proxy = privacy.get('proxy', False)
                        is_tor = privacy.get('tor', False)
                        is_relay = privacy.get('relay', False)
                        is_hosting = privacy.get('hosting', False)

                        return {
                            'is_vpn': is_vpn or is_relay,
                            'is_proxy': is_proxy,
                            'is_tor': is_tor,
                            'is_datacenter': is_hosting,
                            'confidence': 0.9 if (is_vpn or is_proxy or is_tor) else 0.0,
                            'service_name': privacy.get('service'),
                            'detection_method': 'ipinfo_privacy',
                            'details': {
                                'org': data.get('org'),
                                'hostname': data.get('hostname'),
                                'country': data.get('country'),
                                'region': data.get('region'),
                                'city': data.get('city'),
                                'privacy': privacy
                            }
                        }
        except Exception as e:
            logger.debug(f"ipinfo.io check failed: {e}")

        return None

    def _heuristic_check(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply heuristic rules based on hostname and org.

        Args:
            details: Details from previous checks

        Returns:
            Heuristic detection result
        """
        hostname = (details.get('hostname') or '').lower()
        org = (details.get('org') or '').lower()

        # Check hostname patterns
        hostname_match = any(
            pattern in hostname
            for pattern in self.vpn_hostname_patterns
        )

        # Check org patterns
        org_match = any(
            kw in org
            for kw in self.vpn_asn_keywords
        )

        is_vpn = hostname_match or org_match

        return {
            'is_vpn': is_vpn,
            'confidence': 0.4 if is_vpn else 0.0,
            'detection_method': 'heuristic' if is_vpn else 'none'
        }

    def _get_cached(self, ip: str) -> Optional[Dict[str, Any]]:
        """Get cached VPN check result."""
        if ip in _vpn_cache:
            cached = _vpn_cache[ip]
            if datetime.now() - cached.get('_cached_at', datetime.min) < _cache_ttl:
                return cached
            else:
                del _vpn_cache[ip]
        return None

    def _cache_result(self, ip: str, result: Dict[str, Any]) -> None:
        """Cache VPN check result."""
        result['_cached_at'] = datetime.now()
        _vpn_cache[ip] = result

        # Limit cache size
        if len(_vpn_cache) > 10000:
            # Remove oldest entries
            oldest = sorted(_vpn_cache.items(), key=lambda x: x[1].get('_cached_at', datetime.min))
            for k, _ in oldest[:1000]:
                del _vpn_cache[k]


# Global instance
vpn_detector: Optional[VPNDetector] = None


def init_vpn_detector() -> VPNDetector:
    """Initialize the global VPN detector instance."""
    global vpn_detector
    vpn_detector = VPNDetector()
    return vpn_detector


def get_vpn_detector() -> Optional[VPNDetector]:
    """Get the global VPN detector instance."""
    return vpn_detector
