"""
Sanctions Screening & Trade Intelligence Service
Provides sanctions screening against global lists (OFAC SDN, EU, UN, BIS, UK OFSI)
and trade intelligence data for the ATLAS platform.
"""

import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from apscheduler.schedulers.background import BackgroundScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data source constants
# ---------------------------------------------------------------------------
DATA_SOURCES = {
    "OFAC_SDN": {
        "name": "OFAC SDN List",
        "url": "https://sanctionslist.ofac.treas.gov/Home/SdnList",
        "xml_url": "https://www.treasury.gov/ofac/downloads/sdnlist.xml",
        "authority": "U.S. Department of the Treasury",
    },
    "OFAC_CONSOLIDATED": {
        "name": "OFAC Consolidated Sanctions List",
        "url": "https://www.treasury.gov/ofac/downloads/sdnlist.xml",
        "authority": "U.S. Department of the Treasury",
    },
    "EU_CONSOLIDATED": {
        "name": "EU Consolidated Sanctions List",
        "url": "https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions",
        "authority": "European Union",
    },
    "UN_SECURITY_COUNCIL": {
        "name": "UN Security Council Consolidated List",
        "url": "https://scsanctions.un.org/resources/xml/en/consolidated.xml",
        "authority": "United Nations Security Council",
    },
    "BIS_ENTITY_LIST": {
        "name": "BIS Entity List",
        "url": "https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/entity-list",
        "authority": "U.S. Bureau of Industry and Security",
    },
    "UK_OFSI": {
        "name": "UK OFSI Consolidated Sanctions List",
        "url": "https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets",
        "authority": "UK Office of Financial Sanctions Implementation",
    },
}

TRADE_DATA_SOURCES = {
    "WORLD_BANK": "https://api.worldbank.org/v2/",
    "UN_COMTRADE": "https://comtradeapi.un.org/",
    "WTO_STATS": "https://stats.wto.org/",
    "IMF_DATA": "https://www.imf.org/external/datamapper/api/v1/",
}

# ---------------------------------------------------------------------------
# Sanctioned countries with programmes
# ---------------------------------------------------------------------------
SANCTIONED_COUNTRIES: List[Dict[str, Any]] = [
    {"country_code": "IR", "country_name": "Iran", "programs": ["Iran Sanctions", "Iran-related Sanctions", "E.O. 13846"], "severity": "comprehensive", "since": "1979-11-14"},
    {"country_code": "KP", "country_name": "North Korea", "programs": ["North Korea Sanctions", "E.O. 13810", "E.O. 13722"], "severity": "comprehensive", "since": "2008-06-26"},
    {"country_code": "CU", "country_name": "Cuba", "programs": ["Cuba Sanctions", "Cuban Assets Control Regulations"], "severity": "comprehensive", "since": "1963-02-07"},
    {"country_code": "SY", "country_name": "Syria", "programs": ["Syria Sanctions", "E.O. 13894", "Caesar Syria Civilian Protection Act"], "severity": "comprehensive", "since": "2004-05-11"},
    {"country_code": "RU", "country_name": "Russia", "programs": ["Russia/Ukraine-related Sanctions", "E.O. 14024", "E.O. 14114", "Sectoral Sanctions"], "severity": "sectoral", "since": "2014-03-06"},
    {"country_code": "BY", "country_name": "Belarus", "programs": ["Belarus Sanctions", "E.O. 14038"], "severity": "sectoral", "since": "2006-06-16"},
    {"country_code": "MM", "country_name": "Myanmar (Burma)", "programs": ["Burma Sanctions", "E.O. 14014"], "severity": "targeted", "since": "2021-02-10"},
    {"country_code": "VE", "country_name": "Venezuela", "programs": ["Venezuela Sanctions", "E.O. 13884", "E.O. 13692"], "severity": "sectoral", "since": "2015-03-08"},
    {"country_code": "NI", "country_name": "Nicaragua", "programs": ["Nicaragua Sanctions", "E.O. 13851", "NICA Act"], "severity": "targeted", "since": "2018-11-27"},
    {"country_code": "CN", "country_name": "China", "programs": ["CMIC List (NS-CMIC)", "Military End-User List", "Entity List (BIS)", "E.O. 13959"], "severity": "targeted", "since": "2020-11-12", "notes": "Targeted sanctions on specific entities; not comprehensive"},
    {"country_code": "HK", "country_name": "Hong Kong", "programs": ["Hong Kong-related Sanctions", "E.O. 13936"], "severity": "targeted", "since": "2020-07-14", "notes": "Targeted sanctions related to autonomy erosion"},
    {"country_code": "LY", "country_name": "Libya", "programs": ["Libya Sanctions", "E.O. 13726"], "severity": "targeted", "since": "2011-02-25"},
    {"country_code": "SO", "country_name": "Somalia", "programs": ["Somalia Sanctions", "E.O. 13536"], "severity": "targeted", "since": "2010-04-12"},
    {"country_code": "SD", "country_name": "Sudan", "programs": ["Sudan Sanctions", "Darfur Sanctions", "E.O. 13400"], "severity": "targeted", "since": "1997-11-03"},
    {"country_code": "SS", "country_name": "South Sudan", "programs": ["South Sudan Sanctions", "E.O. 13664"], "severity": "targeted", "since": "2014-04-03"},
    {"country_code": "YE", "country_name": "Yemen", "programs": ["Yemen-related Sanctions", "E.O. 13611"], "severity": "targeted", "since": "2012-05-16"},
    {"country_code": "ZW", "country_name": "Zimbabwe", "programs": ["Zimbabwe Sanctions", "E.O. 13469"], "severity": "targeted", "since": "2003-03-07"},
    {"country_code": "XB", "country_name": "Western Balkans", "programs": ["Western Balkans Sanctions", "E.O. 13219", "E.O. 13304"], "severity": "targeted", "since": "2001-06-26", "notes": "Covers individuals/entities across Bosnia, Serbia, Kosovo, North Macedonia, Montenegro, Albania"},
]

# ---------------------------------------------------------------------------
# Mock SDN / sanctions entries
# ---------------------------------------------------------------------------
MOCK_SDN_ENTRIES: List[Dict[str, Any]] = [
    {"id": "SDN-36720", "name": "ISLAMIC REVOLUTIONARY GUARD CORPS (IRGC)", "entity_type": "organization", "country": "IR", "list": "OFAC_SDN", "programs": ["IRAN", "IRGC"], "aliases": ["IRGC", "Sepah-e Pasdaran"], "added_date": "2007-10-25"},
    {"id": "SDN-39498", "name": "KOREAN WORKERS PARTY", "entity_type": "organization", "country": "KP", "list": "OFAC_SDN", "programs": ["NORTH KOREA"], "aliases": ["KWP", "Chosun Rodongdang"], "added_date": "2010-08-30"},
    {"id": "SDN-42180", "name": "ROSOBORONEXPORT", "entity_type": "organization", "country": "RU", "list": "OFAC_SDN", "programs": ["RUSSIA/UKRAINE"], "aliases": ["Rosoboronexport OAO"], "added_date": "2014-07-16"},
    {"id": "SDN-44701", "name": "CENTRAL BANK OF IRAN", "entity_type": "organization", "country": "IR", "list": "OFAC_SDN", "programs": ["IRAN"], "aliases": ["Bank Markazi Jomhouri Islami Iran", "CBI"], "added_date": "2011-11-21"},
    {"id": "SDN-45210", "name": "PETROLEOS DE VENEZUELA S.A.", "entity_type": "organization", "country": "VE", "list": "OFAC_SDN", "programs": ["VENEZUELA"], "aliases": ["PDVSA", "PdVSA"], "added_date": "2019-01-28"},
    {"id": "SDN-38900", "name": "HUAWEI TECHNOLOGIES CO., LTD.", "entity_type": "organization", "country": "CN", "list": "BIS_ENTITY_LIST", "programs": ["ENTITY LIST"], "aliases": ["Huawei"], "added_date": "2019-05-16"},
    {"id": "SDN-47001", "name": "WAGNER GROUP", "entity_type": "organization", "country": "RU", "list": "OFAC_SDN", "programs": ["RUSSIA/UKRAINE", "CAATSA"], "aliases": ["PMC Wagner", "Wagner PMC"], "added_date": "2017-06-20"},
    {"id": "SDN-48320", "name": "SBERBANK OF RUSSIA", "entity_type": "organization", "country": "RU", "list": "OFAC_SDN", "programs": ["RUSSIA/UKRAINE"], "aliases": ["Sberbank", "PAO Sberbank"], "added_date": "2022-02-24"},
    {"id": "SDN-48321", "name": "VTB BANK", "entity_type": "organization", "country": "RU", "list": "OFAC_SDN", "programs": ["RUSSIA/UKRAINE"], "aliases": ["VTB", "Bank VTB PAO"], "added_date": "2022-02-24"},
    {"id": "EU-2024-0451", "name": "MILITARY INDUSTRIAL COMPANY LLC", "entity_type": "organization", "country": "RU", "list": "EU_CONSOLIDATED", "programs": ["EU RUSSIA SANCTIONS"], "aliases": ["Voennaya Promyshlennaya Kompaniya"], "added_date": "2023-06-23"},
    {"id": "UN-6908234", "name": "KOREA MINING DEVELOPMENT TRADING CORPORATION", "entity_type": "organization", "country": "KP", "list": "UN_SECURITY_COUNCIL", "programs": ["UNSCR 1718"], "aliases": ["KOMID"], "added_date": "2009-04-24"},
    {"id": "UN-6908501", "name": "ISLAMIC STATE IN IRAQ AND THE LEVANT", "entity_type": "organization", "country": "SY", "list": "UN_SECURITY_COUNCIL", "programs": ["UNSCR 2170", "UNSCR 2253"], "aliases": ["ISIL", "ISIS", "Daesh"], "added_date": "2014-08-15"},
    {"id": "UK-OFS-12340", "name": "SYRIA INTERNATIONAL ISLAMIC BANK", "entity_type": "organization", "country": "SY", "list": "UK_OFSI", "programs": ["SYRIA SANCTIONS"], "aliases": ["SIIB"], "added_date": "2012-01-18"},
    {"id": "BIS-ENT-5501", "name": "SEMICONDUCTOR MANUFACTURING INTERNATIONAL CORP", "entity_type": "organization", "country": "CN", "list": "BIS_ENTITY_LIST", "programs": ["ENTITY LIST", "MILITARY END-USER"], "aliases": ["SMIC"], "added_date": "2020-12-18"},
    {"id": "SDN-50100", "name": "MYANMAR ECONOMIC HOLDINGS PUBLIC COMPANY LIMITED", "entity_type": "organization", "country": "MM", "list": "OFAC_SDN", "programs": ["BURMA"], "aliases": ["MEHL"], "added_date": "2021-03-25"},
]

# ---------------------------------------------------------------------------
# Mock trade intelligence data
# ---------------------------------------------------------------------------
MOCK_TRADE_PARTNERS: Dict[str, List[Dict[str, Any]]] = {
    "US": [
        {"partner": "CN", "partner_name": "China", "exports_usd": 150_800_000_000, "imports_usd": 427_200_000_000, "balance_usd": -276_400_000_000, "year": 2024},
        {"partner": "CA", "partner_name": "Canada", "exports_usd": 352_600_000_000, "imports_usd": 412_700_000_000, "balance_usd": -60_100_000_000, "year": 2024},
        {"partner": "MX", "partner_name": "Mexico", "exports_usd": 322_500_000_000, "imports_usd": 475_600_000_000, "balance_usd": -153_100_000_000, "year": 2024},
        {"partner": "JP", "partner_name": "Japan", "exports_usd": 80_300_000_000, "imports_usd": 148_200_000_000, "balance_usd": -67_900_000_000, "year": 2024},
        {"partner": "DE", "partner_name": "Germany", "exports_usd": 73_400_000_000, "imports_usd": 136_100_000_000, "balance_usd": -62_700_000_000, "year": 2024},
        {"partner": "KR", "partner_name": "South Korea", "exports_usd": 65_700_000_000, "imports_usd": 115_300_000_000, "balance_usd": -49_600_000_000, "year": 2024},
        {"partner": "GB", "partner_name": "United Kingdom", "exports_usd": 72_100_000_000, "imports_usd": 64_500_000_000, "balance_usd": 7_600_000_000, "year": 2024},
        {"partner": "IN", "partner_name": "India", "exports_usd": 41_900_000_000, "imports_usd": 85_300_000_000, "balance_usd": -43_400_000_000, "year": 2024},
        {"partner": "TW", "partner_name": "Taiwan", "exports_usd": 38_500_000_000, "imports_usd": 77_100_000_000, "balance_usd": -38_600_000_000, "year": 2024},
        {"partner": "BR", "partner_name": "Brazil", "exports_usd": 44_200_000_000, "imports_usd": 38_900_000_000, "balance_usd": 5_300_000_000, "year": 2024},
    ],
    "BR": [
        {"partner": "CN", "partner_name": "China", "exports_usd": 104_300_000_000, "imports_usd": 61_800_000_000, "balance_usd": 42_500_000_000, "year": 2024},
        {"partner": "US", "partner_name": "United States", "exports_usd": 38_900_000_000, "imports_usd": 44_200_000_000, "balance_usd": -5_300_000_000, "year": 2024},
        {"partner": "AR", "partner_name": "Argentina", "exports_usd": 16_200_000_000, "imports_usd": 13_100_000_000, "balance_usd": 3_100_000_000, "year": 2024},
        {"partner": "NL", "partner_name": "Netherlands", "exports_usd": 13_800_000_000, "imports_usd": 5_200_000_000, "balance_usd": 8_600_000_000, "year": 2024},
        {"partner": "DE", "partner_name": "Germany", "exports_usd": 7_600_000_000, "imports_usd": 14_200_000_000, "balance_usd": -6_600_000_000, "year": 2024},
    ],
    "GB": [
        {"partner": "US", "partner_name": "United States", "exports_usd": 64_500_000_000, "imports_usd": 72_100_000_000, "balance_usd": -7_600_000_000, "year": 2024},
        {"partner": "DE", "partner_name": "Germany", "exports_usd": 40_100_000_000, "imports_usd": 74_800_000_000, "balance_usd": -34_700_000_000, "year": 2024},
        {"partner": "CN", "partner_name": "China", "exports_usd": 30_700_000_000, "imports_usd": 78_200_000_000, "balance_usd": -47_500_000_000, "year": 2024},
        {"partner": "NL", "partner_name": "Netherlands", "exports_usd": 33_600_000_000, "imports_usd": 52_100_000_000, "balance_usd": -18_500_000_000, "year": 2024},
        {"partner": "FR", "partner_name": "France", "exports_usd": 31_200_000_000, "imports_usd": 44_600_000_000, "balance_usd": -13_400_000_000, "year": 2024},
    ],
}

MOCK_TRADE_RESTRICTIONS: List[Dict[str, Any]] = [
    {"id": "TR-001", "type": "embargo", "target_country": "RU", "target_name": "Russia", "imposed_by": "US, EU, UK, JP, AU, CA", "sector": "Energy, Finance, Technology", "description": "Comprehensive sectoral sanctions on Russian oil price cap, financial institutions, and technology exports", "effective_date": "2022-02-24", "status": "active"},
    {"id": "TR-002", "type": "embargo", "target_country": "IR", "target_name": "Iran", "imposed_by": "US", "sector": "Oil, Finance, Metals", "description": "Comprehensive trade embargo covering petroleum, financial transactions, and precious metals", "effective_date": "2018-11-05", "status": "active"},
    {"id": "TR-003", "type": "export_control", "target_country": "CN", "target_name": "China", "imposed_by": "US", "sector": "Semiconductors, AI, Quantum Computing", "description": "Export restrictions on advanced semiconductors, chip-making equipment, and AI accelerators", "effective_date": "2022-10-07", "status": "active"},
    {"id": "TR-004", "type": "embargo", "target_country": "KP", "target_name": "North Korea", "imposed_by": "US, UN, EU", "sector": "All sectors", "description": "Near-total trade embargo under multiple UNSC resolutions", "effective_date": "2006-10-14", "status": "active"},
    {"id": "TR-005", "type": "embargo", "target_country": "CU", "target_name": "Cuba", "imposed_by": "US", "sector": "All sectors", "description": "Comprehensive economic embargo under the Trading with the Enemy Act and Helms-Burton Act", "effective_date": "1962-02-07", "status": "active"},
    {"id": "TR-006", "type": "tariff", "target_country": "CN", "target_name": "China", "imposed_by": "US", "sector": "Steel, Aluminum, Electronics, EV", "description": "Section 301 tariffs ranging from 7.5% to 100% across multiple product categories", "effective_date": "2018-07-06", "status": "active"},
    {"id": "TR-007", "type": "export_control", "target_country": "RU", "target_name": "Russia", "imposed_by": "US, EU", "sector": "Oil & Gas Equipment, Aviation, Technology", "description": "Export controls on oil refining equipment, aircraft parts, and dual-use technologies", "effective_date": "2022-02-24", "status": "active"},
    {"id": "TR-008", "type": "embargo", "target_country": "SY", "target_name": "Syria", "imposed_by": "US, EU", "sector": "Oil, Finance, Military", "description": "Sanctions on petroleum, financial sector, and arms under Caesar Act", "effective_date": "2011-08-18", "status": "active"},
    {"id": "TR-009", "type": "export_control", "target_country": "MM", "target_name": "Myanmar", "imposed_by": "US, EU, UK", "sector": "Arms, Dual-Use, Gems", "description": "Arms embargo and restrictions on jade, rubies, and dual-use goods", "effective_date": "2021-02-11", "status": "active"},
    {"id": "TR-010", "type": "tariff", "target_country": "EU", "target_name": "European Union", "imposed_by": "US", "sector": "Steel, Aluminum", "description": "Section 232 tariffs on steel (25%) and aluminum (10%) imports", "effective_date": "2018-03-23", "status": "suspended"},
]

MOCK_COMMODITY_DATA: Dict[str, Dict[str, Any]] = {
    "2709": {
        "hs_code": "2709",
        "description": "Petroleum oils and oils obtained from bituminous minerals, crude",
        "chapter": "Mineral Fuels, Oils",
        "global_trade_value_usd": 1_200_000_000_000,
        "top_exporters": [
            {"country": "SA", "name": "Saudi Arabia", "value_usd": 217_000_000_000, "share_pct": 18.1},
            {"country": "RU", "name": "Russia", "value_usd": 149_000_000_000, "share_pct": 12.4},
            {"country": "CA", "name": "Canada", "value_usd": 120_000_000_000, "share_pct": 10.0},
            {"country": "IQ", "name": "Iraq", "value_usd": 107_000_000_000, "share_pct": 8.9},
            {"country": "AE", "name": "UAE", "value_usd": 80_000_000_000, "share_pct": 6.7},
        ],
        "top_importers": [
            {"country": "CN", "name": "China", "value_usd": 316_000_000_000, "share_pct": 26.3},
            {"country": "IN", "name": "India", "value_usd": 158_000_000_000, "share_pct": 13.2},
            {"country": "US", "name": "United States", "value_usd": 131_000_000_000, "share_pct": 10.9},
            {"country": "KR", "name": "South Korea", "value_usd": 90_000_000_000, "share_pct": 7.5},
            {"country": "JP", "name": "Japan", "value_usd": 78_000_000_000, "share_pct": 6.5},
        ],
        "restrictions": ["Russian crude price cap at $60/barrel (G7/EU)", "Iran export sanctions (US)", "Venezuela export sanctions (US)"],
    },
    "8541": {
        "hs_code": "8541",
        "description": "Semiconductor devices; light-emitting diodes, mounted piezo-electric crystals",
        "chapter": "Electrical Machinery and Equipment",
        "global_trade_value_usd": 430_000_000_000,
        "top_exporters": [
            {"country": "TW", "name": "Taiwan", "value_usd": 112_000_000_000, "share_pct": 26.0},
            {"country": "KR", "name": "South Korea", "value_usd": 89_000_000_000, "share_pct": 20.7},
            {"country": "CN", "name": "China", "value_usd": 67_000_000_000, "share_pct": 15.6},
            {"country": "JP", "name": "Japan", "value_usd": 41_000_000_000, "share_pct": 9.5},
            {"country": "US", "name": "United States", "value_usd": 34_000_000_000, "share_pct": 7.9},
        ],
        "top_importers": [
            {"country": "CN", "name": "China", "value_usd": 175_000_000_000, "share_pct": 40.7},
            {"country": "US", "name": "United States", "value_usd": 56_000_000_000, "share_pct": 13.0},
            {"country": "KR", "name": "South Korea", "value_usd": 38_000_000_000, "share_pct": 8.8},
            {"country": "JP", "name": "Japan", "value_usd": 29_000_000_000, "share_pct": 6.7},
            {"country": "DE", "name": "Germany", "value_usd": 22_000_000_000, "share_pct": 5.1},
        ],
        "restrictions": ["US export controls on advanced chips to China (Oct 2022)", "BIS Entity List restrictions on SMIC, Huawei", "Netherlands/Japan equipment export restrictions"],
    },
    "7108": {
        "hs_code": "7108",
        "description": "Gold, unwrought or in semi-manufactured forms, or in powder form",
        "chapter": "Precious Metals",
        "global_trade_value_usd": 380_000_000_000,
        "top_exporters": [
            {"country": "CH", "name": "Switzerland", "value_usd": 95_000_000_000, "share_pct": 25.0},
            {"country": "AU", "name": "Australia", "value_usd": 22_000_000_000, "share_pct": 5.8},
            {"country": "HK", "name": "Hong Kong", "value_usd": 40_000_000_000, "share_pct": 10.5},
            {"country": "AE", "name": "UAE", "value_usd": 37_000_000_000, "share_pct": 9.7},
            {"country": "GB", "name": "United Kingdom", "value_usd": 56_000_000_000, "share_pct": 14.7},
        ],
        "top_importers": [
            {"country": "IN", "name": "India", "value_usd": 56_000_000_000, "share_pct": 14.7},
            {"country": "CN", "name": "China", "value_usd": 52_000_000_000, "share_pct": 13.7},
            {"country": "GB", "name": "United Kingdom", "value_usd": 49_000_000_000, "share_pct": 12.9},
            {"country": "HK", "name": "Hong Kong", "value_usd": 38_000_000_000, "share_pct": 10.0},
            {"country": "US", "name": "United States", "value_usd": 29_000_000_000, "share_pct": 7.6},
        ],
        "restrictions": ["Ban on Russian gold imports (G7)", "Anti-money laundering controls"],
    },
}

# ---------------------------------------------------------------------------
# Screening stats (in-memory counters -- would be Redis/DB in production)
# ---------------------------------------------------------------------------
screening_stats = {
    "total_screenings": 14_832,
    "matches_found": 247,
    "lists_tracked": len(DATA_SOURCES),
    "last_sync": (datetime.utcnow() - timedelta(hours=2)).isoformat() + "Z",
    "sync_interval_hours": 6,
    "uptime_since": datetime.utcnow().isoformat() + "Z",
}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ScreeningRequest(BaseModel):
    entity_name: str = Field(..., min_length=1, max_length=500, description="Name of entity to screen")
    entity_type: str = Field("organization", description="Type: individual, organization, vessel, aircraft")
    country_code: Optional[str] = Field(None, max_length=2, description="ISO 3166-1 alpha-2 country code")
    additional_info: Optional[Dict[str, Any]] = Field(None, description="Extra identifiers (DOB, passport, tax ID)")


class MatchResult(BaseModel):
    match_id: str
    matched_name: str
    list_source: str
    list_name: str
    confidence_score: float = Field(..., ge=0, le=100)
    entity_type: str
    country: Optional[str]
    programs: List[str]
    aliases: List[str]
    added_date: str
    match_details: Dict[str, Any]


class ScreeningResponse(BaseModel):
    screening_id: str
    timestamp: str
    entity_name: str
    entity_type: str
    country_code: Optional[str]
    total_matches: int
    highest_confidence: float
    risk_level: str
    matches: List[MatchResult]


class BatchScreeningRequest(BaseModel):
    entities: List[ScreeningRequest] = Field(..., min_length=1, max_length=100)


class BatchScreeningResponse(BaseModel):
    batch_id: str
    timestamp: str
    total_entities: int
    total_matches: int
    results: List[ScreeningResponse]


class TradeIntelligenceRequest(BaseModel):
    origin_country: str = Field(..., min_length=2, max_length=2)
    destination_country: str = Field(..., min_length=2, max_length=2)
    hs_code: Optional[str] = Field(None, description="Harmonized System code for commodity")
    year: Optional[int] = Field(None, ge=2000, le=2030)


class TradeIntelligenceResponse(BaseModel):
    origin_country: str
    destination_country: str
    year: int
    exports_usd: float
    imports_usd: float
    trade_balance_usd: float
    tariff_info: Optional[Dict[str, Any]]
    restrictions: List[Dict[str, Any]]
    data_sources: List[str]


class SanctionsListInfo(BaseModel):
    list_key: str
    name: str
    authority: str
    source_url: str
    last_updated: str
    total_entries: int
    status: str


class SanctionedCountry(BaseModel):
    country_code: str
    country_name: str
    programs: List[str]
    severity: str
    since: str
    notes: Optional[str] = None


class StatsResponse(BaseModel):
    total_screenings: int
    matches_found: int
    lists_tracked: int
    last_sync: str
    sync_interval_hours: int
    uptime_since: str
    match_rate_pct: float


# ---------------------------------------------------------------------------
# Screening logic
# ---------------------------------------------------------------------------

def _fuzzy_score(query: str, target: str) -> float:
    """Simple token-overlap similarity. Production would use Levenshtein / Jaro-Winkler."""
    q_tokens = set(query.upper().split())
    t_tokens = set(target.upper().split())
    if not q_tokens or not t_tokens:
        return 0.0
    intersection = q_tokens & t_tokens
    union = q_tokens | t_tokens
    jaccard = len(intersection) / len(union)
    # Boost for exact match
    if query.upper() == target.upper():
        return 100.0
    return round(jaccard * 95, 2)


def _check_aliases(query: str, aliases: List[str]) -> float:
    """Check query against aliases and return best score."""
    best = 0.0
    for alias in aliases:
        score = _fuzzy_score(query, alias)
        if score > best:
            best = score
    return best


def screen_entity(req: ScreeningRequest) -> ScreeningResponse:
    """Screen an entity against all mock sanctions lists."""
    matches: List[MatchResult] = []
    for entry in MOCK_SDN_ENTRIES:
        name_score = _fuzzy_score(req.entity_name, entry["name"])
        alias_score = _check_aliases(req.entity_name, entry.get("aliases", []))
        best_score = max(name_score, alias_score)

        # Country boost
        if req.country_code and entry.get("country") == req.country_code.upper():
            best_score = min(best_score + 10, 100.0)

        # Type match boost
        if req.entity_type and entry.get("entity_type") == req.entity_type:
            best_score = min(best_score + 5, 100.0)

        if best_score >= 30.0:
            match_via = "name" if name_score >= alias_score else "alias"
            matches.append(MatchResult(
                match_id=entry["id"],
                matched_name=entry["name"],
                list_source=entry["list"],
                list_name=DATA_SOURCES.get(entry["list"], {}).get("name", entry["list"]),
                confidence_score=best_score,
                entity_type=entry.get("entity_type", "unknown"),
                country=entry.get("country"),
                programs=entry.get("programs", []),
                aliases=entry.get("aliases", []),
                added_date=entry.get("added_date", ""),
                match_details={
                    "matched_via": match_via,
                    "name_score": name_score,
                    "alias_score": alias_score,
                    "country_match": req.country_code is not None and entry.get("country") == (req.country_code or "").upper(),
                },
            ))

    matches.sort(key=lambda m: m.confidence_score, reverse=True)
    highest = matches[0].confidence_score if matches else 0.0

    if highest >= 85:
        risk_level = "critical"
    elif highest >= 60:
        risk_level = "high"
    elif highest >= 40:
        risk_level = "medium"
    elif matches:
        risk_level = "low"
    else:
        risk_level = "clear"

    # Update stats
    screening_stats["total_screenings"] += 1
    if matches:
        screening_stats["matches_found"] += 1

    return ScreeningResponse(
        screening_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow().isoformat() + "Z",
        entity_name=req.entity_name,
        entity_type=req.entity_type,
        country_code=req.country_code,
        total_matches=len(matches),
        highest_confidence=highest,
        risk_level=risk_level,
        matches=matches,
    )


# ---------------------------------------------------------------------------
# Data sync scheduler
# ---------------------------------------------------------------------------
scheduler = BackgroundScheduler()


def sync_sanctions_lists():
    """Periodic job to pull latest sanctions list data.

    In production this would download and parse XML/CSV from each authority.
    Here we simply update the last_sync timestamp.
    """
    logger.info("Starting sanctions list sync...")
    for key, source in DATA_SOURCES.items():
        logger.info("  Syncing %s from %s", key, source.get("url", source.get("xml_url", "")))
    screening_stats["last_sync"] = datetime.utcnow().isoformat() + "Z"
    logger.info("Sanctions list sync complete.")


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Sanctions Screening service starting...")
    scheduler.add_job(sync_sanctions_lists, "interval", hours=6, id="sanctions_sync", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started -- syncing sanctions lists every 6 hours.")
    sync_sanctions_lists()  # initial sync
    yield
    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("Sanctions Screening service stopped.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ATLAS Sanctions Screening & Trade Intelligence",
    version="1.0.0",
    description="Sanctions screening against OFAC SDN, EU, UN, BIS, UK OFSI lists and global trade intelligence.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "sanctions-screening",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "scheduler_running": scheduler.running,
    }


# ---------------------------------------------------------------------------
# Sanctions endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/sanctions/screen", response_model=ScreeningResponse)
async def screen_entity_endpoint(request: ScreeningRequest):
    """Screen a single entity against all sanctions lists."""
    return screen_entity(request)


@app.get("/api/v1/sanctions/lists", response_model=List[SanctionsListInfo])
async def get_sanctions_lists():
    """List available sanctions lists with metadata."""
    now = datetime.utcnow()
    entry_counts = {
        "OFAC_SDN": 12_458,
        "OFAC_CONSOLIDATED": 15_320,
        "EU_CONSOLIDATED": 9_847,
        "UN_SECURITY_COUNCIL": 1_024,
        "BIS_ENTITY_LIST": 638,
        "UK_OFSI": 4_215,
    }
    results = []
    for key, source in DATA_SOURCES.items():
        results.append(SanctionsListInfo(
            list_key=key,
            name=source["name"],
            authority=source["authority"],
            source_url=source.get("url", source.get("xml_url", "")),
            last_updated=(now - timedelta(hours=2, minutes=hash(key) % 60)).isoformat() + "Z",
            total_entries=entry_counts.get(key, 0),
            status="active",
        ))
    return results


@app.get("/api/v1/sanctions/countries", response_model=List[SanctionedCountry])
async def get_sanctioned_countries():
    """Get all sanctioned countries with sanction programs."""
    return [SanctionedCountry(**c) for c in SANCTIONED_COUNTRIES]


@app.post("/api/v1/sanctions/batch", response_model=BatchScreeningResponse)
async def batch_screen(request: BatchScreeningRequest):
    """Batch screen multiple entities."""
    results = [screen_entity(entity) for entity in request.entities]
    total_matches = sum(r.total_matches for r in results)
    return BatchScreeningResponse(
        batch_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow().isoformat() + "Z",
        total_entities=len(results),
        total_matches=total_matches,
        results=results,
    )


@app.get("/api/v1/sanctions/stats", response_model=StatsResponse)
async def get_stats():
    """Dashboard statistics for sanctions screening."""
    total = screening_stats["total_screenings"]
    found = screening_stats["matches_found"]
    return StatsResponse(
        total_screenings=total,
        matches_found=found,
        lists_tracked=screening_stats["lists_tracked"],
        last_sync=screening_stats["last_sync"],
        sync_interval_hours=screening_stats["sync_interval_hours"],
        uptime_since=screening_stats["uptime_since"],
        match_rate_pct=round((found / total) * 100, 2) if total else 0.0,
    )


# ---------------------------------------------------------------------------
# Trade intelligence endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/trade/intelligence", response_model=TradeIntelligenceResponse)
async def trade_intelligence(request: TradeIntelligenceRequest):
    """Get trade intelligence for a country pair."""
    origin = request.origin_country.upper()
    dest = request.destination_country.upper()
    year = request.year or 2024

    # Look up in mock data
    partners = MOCK_TRADE_PARTNERS.get(origin, [])
    pair = next((p for p in partners if p["partner"] == dest), None)

    if pair:
        exports = pair["exports_usd"]
        imports = pair["imports_usd"]
    else:
        # Generate plausible mock values
        exports = 5_200_000_000.0
        imports = 3_800_000_000.0

    # Find applicable restrictions
    restrictions = [
        r for r in MOCK_TRADE_RESTRICTIONS
        if r["target_country"] in (origin, dest) and r["status"] == "active"
    ]

    tariff_info = None
    for r in MOCK_TRADE_RESTRICTIONS:
        if r["type"] == "tariff" and r["target_country"] in (origin, dest):
            tariff_info = {"description": r["description"], "sector": r["sector"], "effective_date": r["effective_date"]}
            break

    return TradeIntelligenceResponse(
        origin_country=origin,
        destination_country=dest,
        year=year,
        exports_usd=exports,
        imports_usd=imports,
        trade_balance_usd=exports - imports,
        tariff_info=tariff_info,
        restrictions=restrictions,
        data_sources=list(TRADE_DATA_SOURCES.keys()),
    )


@app.get("/api/v1/trade/partners/{country_code}")
async def trade_partners(country_code: str):
    """Top trade partners for a given country."""
    code = country_code.upper()
    partners = MOCK_TRADE_PARTNERS.get(code)
    if partners is None:
        raise HTTPException(status_code=404, detail=f"No trade partner data available for {code}")
    return {
        "country_code": code,
        "year": 2024,
        "total_partners": len(partners),
        "partners": partners,
        "data_sources": ["UN_COMTRADE", "WORLD_BANK", "WTO_STATS"],
    }


@app.get("/api/v1/trade/restrictions")
async def trade_restrictions(
    status: Optional[str] = Query(None, description="Filter by status: active, suspended"),
    target_country: Optional[str] = Query(None, description="Filter by target country code"),
    restriction_type: Optional[str] = Query(None, description="Filter by type: embargo, tariff, export_control"),
):
    """Active trade restrictions and embargoes."""
    results = MOCK_TRADE_RESTRICTIONS
    if status:
        results = [r for r in results if r["status"] == status]
    if target_country:
        results = [r for r in results if r["target_country"] == target_country.upper()]
    if restriction_type:
        results = [r for r in results if r["type"] == restriction_type]
    return {
        "total": len(results),
        "restrictions": results,
        "data_sources": list(TRADE_DATA_SOURCES.keys()),
    }


@app.get("/api/v1/trade/commodities/{hs_code}")
async def commodity_trade_flows(hs_code: str):
    """Commodity trade flows by HS code."""
    data = MOCK_COMMODITY_DATA.get(hs_code)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No trade data for HS code {hs_code}. Available codes: {list(MOCK_COMMODITY_DATA.keys())}")
    return {
        "hs_code": data["hs_code"],
        "description": data["description"],
        "chapter": data["chapter"],
        "global_trade_value_usd": data["global_trade_value_usd"],
        "top_exporters": data["top_exporters"],
        "top_importers": data["top_importers"],
        "restrictions": data["restrictions"],
        "data_sources": list(TRADE_DATA_SOURCES.keys()),
    }


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8093"))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info("Starting Sanctions Screening service on %s:%d", host, port)
    uvicorn.run(app, host=host, port=port, log_level="info")
