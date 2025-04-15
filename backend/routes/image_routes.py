from flask import Blueprint, request, jsonify, current_app, send_file, send_from_directory
from flask_socketio import emit
import os
from werkzeug.utils import secure_filename
from utils.detection_utils import process_detection, load_model, detect_weapons, draw_detections
from utils.weapon_info import WeaponInfo
import logging
import time
import psutil
import cv2
import numpy as np
from config import Config
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
image_bp = Blueprint('image', __name__)

# Load the weapon detection model
weapon_model = load_model(Config.WEAPON_MODEL_PATH)

# Initialize weapon info
weapon_info = WeaponInfo()

def allowed_file(filename):
    """Check if the file type is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

def get_system_info():
    """Get system information for logging."""
    cpu_percent = psutil.cpu_percent()
    memory = psutil.virtual_memory()
    return {
        'cpu_percent': cpu_percent,
        'memory_percent': memory.percent,
        'memory_available': memory.available / (1024 * 1024)  # MB
    }

@image_bp.route('/detect', methods=['POST'])
def detect_weapons_in_image():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400

        # Read the image
        nparr = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({'success': False, 'error': 'Failed to read image'}), 400

        # Detect weapons
        detections = detect_weapons(model=weapon_model, frame=image)
        logger.info(f"Detected {len(detections)} weapons in image")
        
        # Log each detection
        for detection in detections:
            logger.info(f"Detected weapon: {detection['class']} with confidence: {detection['confidence']:.2f}")

        # Draw detections on the image
        processed_image = draw_detections(image.copy(), detections)

        # Save the processed image
        timestamp = int(time.time())
        processed_filename = f'processed_{timestamp}.jpg'
        processed_path = os.path.join(Config.PROCESSED_IMAGES_DIR, processed_filename)
        
        # Ensure the directory exists
        os.makedirs(Config.PROCESSED_IMAGES_DIR, exist_ok=True)
        
        cv2.imwrite(processed_path, processed_image)
        logger.info(f"Saved processed image to: {processed_path}")

        # Analyze each detection
        analysis_results = []
        for detection in detections:
            try:
                # Get weapon information
                weapon_data = weapon_info.get_weapon_info(detection['class'])
                
                # Get risk assessment
                risk_data = weapon_info.get_risk_assessment(detection['class'], detection['confidence'])
                
                # Log the analysis
                logger.info(f"Analysis for {detection['class']}:")
                logger.info(f"Description: {weapon_data.get('description', 'N/A')}")
                logger.info(f"Risk Level: {risk_data.get('risk_level', 'N/A')}")
                
                # Combine the data
                analysis_result = {
                    'class': detection['class'],
                    'confidence': float(detection['confidence']),
                    'bbox': {
                        'x': int(detection['bbox'][0]),
                        'y': int(detection['bbox'][1]),
                        'width': int(detection['bbox'][2]),
                        'height': int(detection['bbox'][3])
                    },
                    'weapon_info': {
                        'description': weapon_data.get('description', ''),
                        'specifications': weapon_data.get('specifications', {}),
                        'risk_assessment': risk_data.get('threat_analysis', ''),
                        'recommended_actions': risk_data.get('recommended_actions', [])
                    }
                }
                analysis_results.append(analysis_result)
            except Exception as e:
                logger.error(f"Error analyzing detection: {str(e)}")
                continue

        # Remove the original uploaded file if it exists
        try:
            uploaded_file_path = os.path.join(Config.UPLOAD_FOLDER, secure_filename(file.filename))
            if os.path.exists(uploaded_file_path):
                os.remove(uploaded_file_path)
        except Exception as e:
            logger.warning(f"Could not remove uploaded file: {str(e)}")

        return jsonify({
            'success': True,
            'detections': len(detections),
            'analysis': analysis_results,
            'processed_image_url': f'/api/image/processed/{processed_filename}'
        })

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@image_bp.route('/processed/<filename>')
def serve_processed_image(filename):
    """Serve processed images."""
    try:
        return send_file(os.path.join(Config.PROCESSED_IMAGES_DIR, filename))
    except Exception as e:
        logger.error(f"Error serving processed image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 404

@image_bp.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
    return response 