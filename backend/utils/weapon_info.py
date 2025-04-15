import os
import google.generativeai as genai
import logging
from typing import Dict, Optional
import json
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")

genai.configure(api_key=GEMINI_API_KEY)

# Initialize the model
try:
    # Use gemini-1.5-pro model which supports text generation
    model = genai.GenerativeModel('gemini-1.5-pro')
    logger.info("Successfully initialized Gemini model: gemini-1.5-pro")
except Exception as e:
    logger.error(f"Error initializing Gemini model: {str(e)}")
    raise

class WeaponInfo:
    """Class to handle weapon information retrieval using Gemini API"""
    
    # Rate limiting configuration
    RATE_LIMIT_WINDOW = 60  # seconds
    MAX_REQUESTS_PER_WINDOW = 3
    _request_timestamps = []
    
    @staticmethod
    def _check_rate_limit():
        """Check if we're within rate limits and wait if necessary"""
        now = datetime.now()
        # Remove timestamps older than the window
        WeaponInfo._request_timestamps = [
            ts for ts in WeaponInfo._request_timestamps
            if now - ts < timedelta(seconds=WeaponInfo.RATE_LIMIT_WINDOW)
        ]
        
        if len(WeaponInfo._request_timestamps) >= WeaponInfo.MAX_REQUESTS_PER_WINDOW:
            # Calculate wait time
            oldest_request = WeaponInfo._request_timestamps[0]
            wait_time = (oldest_request + timedelta(seconds=WeaponInfo.RATE_LIMIT_WINDOW) - now).total_seconds()
            if wait_time > 0:
                logger.info(f"Rate limit reached. Waiting {wait_time:.1f} seconds...")
                time.sleep(wait_time)
                # Clear timestamps after waiting
                WeaponInfo._request_timestamps = []
    
    @staticmethod
    def _record_request():
        """Record a new API request timestamp"""
        WeaponInfo._request_timestamps.append(datetime.now())
    
    # Fallback weapon database for when API is not available
    FALLBACK_DATABASE = {
        'knife': {
            'name': 'Knife',
            'type': 'Edged Weapon',
            'description': 'A bladed weapon used for cutting or stabbing. Can cause severe injuries or fatalities.',
            'specifications': {
                'model': 'Various',
                'caliber_or_size': 'Varies by type',
                'effective_range': 'Close range',
                'weight': 'Varies by type',
                'manufacturer': 'Various manufacturers'
            },
            'risk_factor': 'high',
            'prevention_measures': [
                'Install metal detectors',
                'Implement strict security checks',
                'Train security personnel in knife detection'
            ]
        },
        'gun': {
            'name': 'Firearm',
            'type': 'Ranged Weapon',
            'description': 'A ranged weapon that uses explosive propellant to launch projectiles. Can cause multiple casualties.',
            'specifications': {
                'model': 'Various',
                'caliber_or_size': 'Varies by type',
                'effective_range': 'Varies by type',
                'weight': 'Varies by type',
                'manufacturer': 'Various manufacturers'
            },
            'risk_factor': 'critical',
            'prevention_measures': [
                'Install weapon detection systems',
                'Implement strict access control',
                'Train security personnel in firearm detection'
            ]
        }
    }
    
    def __init__(self):
        self.model = model

    def get_weapon_info(self, weapon_name):
        """Get detailed information about a weapon using Gemini AI"""
        try:
            prompt = f"""Analyze this weapon and provide information in the following JSON format:
            {{
                "name": "{weapon_name}",
                "type": "weapon type",
                "description": "detailed description",
                "specifications": {{
                    "model": "specific model if known",
                    "caliber/size": "caliber or size information",
                    "effective_range": "effective range",
                    "weight": "weight information",
                    "manufacturer": "manufacturer if known"
                }},
                "risk_factor": "low/medium/high",
                "prevention_measures": ["list of prevention measures"]
            }}

            Provide accurate and detailed information about {weapon_name}."""

            response = self.model.generate_content(prompt)
            response.resolve()
            
            try:
                weapon_data = json.loads(response.text)
                return weapon_data
            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini response as JSON")
                return {
                    "name": weapon_name,
                    "type": "unknown",
                    "description": "No information available",
                    "specifications": {},
                    "risk_factor": "unknown",
                    "prevention_measures": []
                }

        except Exception as e:
            logger.error(f"Error getting weapon info: {str(e)}")
            return {
                "name": weapon_name,
                "type": "unknown",
                "description": "Error retrieving information",
                "specifications": {},
                "risk_factor": "unknown",
                "prevention_measures": []
            }

    def get_risk_assessment(self, weapon_name, confidence=None):
        """Get risk assessment for a weapon using Gemini AI"""
        try:
            confidence_str = f" with {confidence:.2f} confidence" if confidence else ""
            prompt = f"""Analyze the risk of {weapon_name}{confidence_str} and provide assessment in the following JSON format:
            {{
                "threat_analysis": "detailed threat analysis",
                "risk_level": "low/medium/high",
                "recommended_actions": ["list of recommended actions"],
                "safety_measures": ["list of safety measures"],
                "emergency_procedures": ["list of emergency procedures"]
            }}

            Provide a comprehensive risk assessment."""

            response = self.model.generate_content(prompt)
            response.resolve()
            
            try:
                risk_data = json.loads(response.text)
                return risk_data
            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini response as JSON")
                return {
                    "threat_analysis": "Unable to assess risk",
                    "risk_level": "unknown",
                    "recommended_actions": [],
                    "safety_measures": [],
                    "emergency_procedures": []
                }

        except Exception as e:
            logger.error(f"Error getting risk assessment: {str(e)}")
            return {
                "threat_analysis": "Error assessing risk",
                "risk_level": "unknown",
                "recommended_actions": [],
                "safety_measures": [],
                "emergency_procedures": []
            } 