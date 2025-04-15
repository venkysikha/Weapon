from flask import Blueprint, request, jsonify, current_app, send_file, Response, send_from_directory
import os
from werkzeug.utils import secure_filename
from utils.detection_utils import load_model, detect_weapons, draw_detections
from utils.weapon_info import WeaponInfo
from config import Config
import logging
import time
import psutil
import cv2
import re
from flask_socketio import emit
import numpy as np
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create blueprint
video_bp = Blueprint('video', __name__)

# Create necessary directories
Config.create_directories()

# Load the weapon detection model
weapon_model = load_model(Config.WEAPON_MODEL_PATH)

def ensure_directory_exists(directory):
    """Ensure directory exists and has write permissions"""
    try:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"Created directory: {directory}")
        if not os.access(directory, os.W_OK):
            logger.error(f"No write permissions for directory: {directory}")
            return False
        return True
    except Exception as e:
        logger.error(f"Error creating directory {directory}: {str(e)}")
        return False

def allowed_file(filename):
    """Check if the file type is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'mp4', 'avi', 'mov'}

def get_system_info():
    """Get system information for logging"""
    try:
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        return {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available': memory.available / (1024 * 1024)  # Convert to MB
        }
    except Exception as e:
        logger.warning(f"Error getting system info: {str(e)}")
        return {
            'cpu_percent': 0,
            'memory_percent': 0,
            'memory_available': 0
        }

def log_system_info():
    """Log system information for debugging"""
    try:
        system_info = get_system_info()
        logger.info(f"System Info - CPU: {system_info['cpu_percent']}%, Memory: {system_info['memory_percent']}%, Available: {system_info['memory_available']:.2f}MB")
    except Exception as e:
        logger.warning(f"Error logging system info: {str(e)}")

def cleanup_old_files():
    """Remove files older than 24 hours from upload and processed directories"""
    current_time = time.time()
    for directory in [Config.UPLOAD_FOLDER, Config.PROCESSED_VIDEOS_FOLDER]:
        try:
            for filename in os.listdir(directory):
                file_path = os.path.join(directory, filename)
                if os.path.isfile(file_path):
                    file_age = current_time - os.path.getmtime(file_path)
                    if file_age > 24 * 3600:  # 24 hours in seconds
                        os.remove(file_path)
                        logger.info(f"Removed old file: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up files in {directory}: {str(e)}")

def draw_bounding_box(frame, x1, y1, x2, y2, label, confidence):
    """Draw a bounding box with label on the frame"""
    try:
        # Convert coordinates to integers
        x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
        
        # Draw the bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        # Create the label text
        label_text = f"{label}: {confidence:.2f}"
        
        # Calculate text size
        (text_width, text_height), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
        
        # Draw background rectangle for text
        cv2.rectangle(frame, (x1, y1 - text_height - 10), (x1 + text_width, y1), (0, 255, 0), -1)
        
        # Draw the text
        cv2.putText(frame, label_text, (x1, y1 - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        
        return frame
    except Exception as e:
        logger.error(f"Error drawing bounding box: {str(e)}")
        return frame

@video_bp.route('/api/video/detect', methods=['POST'])
def process_video():
    """Process video for weapon detection"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
            
        # Clean up old files
        cleanup_old_files()
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        input_path = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(input_path)
        
        # Initialize video capture
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            return jsonify({'error': 'Error opening video file'}), 500
            
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Create output video writer
        output_path = os.path.join(Config.PROCESSED_VIDEOS_FOLDER, f'processed_{filename}')
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            return jsonify({'error': 'Error creating output video'}), 500
            
        # Process video frames
        frame_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        detections_summary = {}
        weapon_info = WeaponInfo()
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process every 30th frame
            if frame_count % 30 == 0:
                # Detect weapons
                detections = detect_weapons(weapon_model, frame)
                
                # Draw detections and collect information
                for detection in detections:
                    class_name = detection['class']
                    confidence = detection['confidence']
                    
                    # Draw detection on frame
                    frame = draw_detections(frame, [detection])
                    
                    # Update detections summary
                    if class_name not in detections_summary:
                        detections_summary[class_name] = {
                            'count': 0,
                            'max_confidence': 0,
                            'frames_detected': [],
                            'info': weapon_info.get_weapon_info(class_name),
                            'risk_assessment': weapon_info.get_risk_assessment(class_name, confidence)
                        }
                    
                    detections_summary[class_name]['count'] += 1
                    detections_summary[class_name]['max_confidence'] = max(
                        detections_summary[class_name]['max_confidence'],
                        confidence
                    )
                    detections_summary[class_name]['frames_detected'].append(frame_count)
            
            # Write processed frame
            out.write(frame)
            frame_count += 1
            
        # Release resources
        cap.release()
        out.release()
        
        # Remove original file
        os.remove(input_path)
        
        return jsonify({
            'success': True,
            'total_frames': total_frames,
            'processed_frames': frame_count,
            'processing_time': time.time() - start_time,
            'detections_summary': detections_summary,
            'processed_video_url': f'/api/video/processed/{filename}'
        })
        
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        return jsonify({'error': str(e)}), 500

@video_bp.route('/api/video/processed/<filename>')
def serve_processed_video(filename):
    """Serve processed video file"""
    try:
        processed_path = os.path.join(Config.PROCESSED_VIDEOS_FOLDER, f'processed_{filename}')
        if not os.path.exists(processed_path):
            return jsonify({'error': 'Processed video not found'}), 404
            
        return send_file(processed_path, mimetype='video/mp4')
        
    except Exception as e:
        logger.error(f"Error serving processed video: {str(e)}")
        return jsonify({'error': str(e)}), 500

@video_bp.after_request
def after_request(response):
    try:
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Range'
        return response
    except Exception as e:
        logger.error(f"Error in after_request: {str(e)}")
        return response 