import React, { useState } from 'react';
import {
    Box,
    Button,
    Paper,
    Typography,
    CircularProgress,
    Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import { detectImage } from '../services/api';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

function ImageDetection() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [predictedImage, setPredictedImage] = useState(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
            setPredictedImage(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select an image first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await detectImage(selectedFile);
            setResult(response);

            // Create a canvas to draw the image with bounding boxes
            const img = new Image();
            img.src = preview;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Draw bounding boxes
                response.detections.forEach(detection => {
                    const [x1, y1, x2, y2] = detection.bbox;
                    ctx.strokeStyle = '#FF0000';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                    
                    // Add label and confidence
                    ctx.fillStyle = '#FF0000';
                    ctx.font = '16px Arial';
                    ctx.fillText(
                        `${detection.class} (${Math.round(detection.confidence * 100)}%)`,
                        x1,
                        y1 - 5
                    );
                });

                setPredictedImage(canvas.toDataURL());
            };
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred during detection');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Button
                        component="label"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                        fullWidth
                    >
                        Upload Image
                        <VisuallyHiddenInput type="file" onChange={handleFileSelect} accept="image/*" />
                    </Button>

                    {preview && (
                        <Box sx={{ mt: 2, width: '100%' }}>
                            <Typography variant="h6" gutterBottom>
                                Original Image:
                            </Typography>
                            <img
                                src={preview}
                                alt="Preview"
                                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                            />
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={!selectedFile || loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                        fullWidth
                    >
                        {loading ? 'Processing...' : 'Detect Weapons'}
                    </Button>

                    {error && (
                        <Alert severity="error" sx={{ width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                </Box>
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    {predictedImage ? (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Detection Results:
                            </Typography>
                            <img
                                src={predictedImage}
                                alt="Predicted"
                                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                            />
                            {result && (
                                <Box sx={{ width: '100%', mt: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Detected Objects:
                                    </Typography>
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {result.detections.map((detection, idx) => (
                                            <li key={idx} style={{ marginBottom: '8px' }}>
                                                <Typography>
                                                    {detection.class} (Confidence: {Math.round(detection.confidence * 100)}%)
                                                </Typography>
                                            </li>
                                        ))}
                                    </ul>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Typography variant="body1" color="text.secondary">
                            Upload an image and click "Detect Weapons" to see results
                        </Typography>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}

export default ImageDetection; 