import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const ImageDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setDetectionResults(null);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setDetectionResults(null);
    } else {
      setError('Please upload a valid image file (JPEG or PNG)');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image file first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/api/image/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        // Process the response data
        const processedData = {
          detections: response.data.detections || 0,
          processed_image_url: response.data.processed_image_url || '',
          analysis: Array.isArray(response.data.analysis) 
            ? response.data.analysis.map(item => ({
                class: item.class || 'Unknown Weapon',
                confidence: item.confidence || 0,
                bbox: item.bbox || {},
                weapon_info: typeof item.weapon_info === 'string' 
                  ? JSON.parse(item.weapon_info) 
                  : item.weapon_info || {}
              }))
            : []
        };
        setDetectionResults(processedData);
      } else {
        setError(response.data?.error || 'Failed to process image');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error processing image');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderAnalysis = (analysis) => {
    if (!analysis || typeof analysis !== 'object') return null;

    const { class: weaponClass, confidence, weapon_info } = analysis;
    const weaponName = weaponClass || 'Unknown Weapon';
    const confidencePercentage = confidence ? (confidence * 100).toFixed(2) : '0.00';

    return (
      <Grid item xs={12} md={6}>
        <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {weaponName}
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Confidence: {confidencePercentage}%
          </Typography>

          {weapon_info && typeof weapon_info === 'object' && (
            <>
              {weapon_info.description && (
                <Typography variant="body2" paragraph>
                  {weapon_info.description}
                </Typography>
              )}

              {weapon_info.risk_assessment && (
                <Typography variant="body2" paragraph>
                  Risk Assessment: {weapon_info.risk_assessment}
                </Typography>
              )}

              {Array.isArray(weapon_info.recommended_actions) && weapon_info.recommended_actions.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Actions:
                  </Typography>
                  <ul>
                    {weapon_info.recommended_actions.map((action, index) => (
                      <li key={index}>
                        <Typography variant="body2">{action}</Typography>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Paper>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Image Weapon Detection
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: 'primary.main',
          backgroundColor: 'background.paper',
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {previewUrl ? (
          <Box sx={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
            <img
              src={previewUrl}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drag and drop an image here, or
            </Typography>
            <Button
              component="label"
              variant="contained"
              startIcon={<ImageIcon />}
            >
              Select Image
              <VisuallyHiddenInput
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
              />
            </Button>
          </>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing}
          startIcon={isProcessing ? <CircularProgress size={20} /> : null}
        >
          {isProcessing ? 'Processing...' : 'Detect Weapons'}
        </Button>
      </Box>

      {detectionResults && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Detection Results
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Total Detections: {detectionResults.detections || 0}
          </Typography>

          {detectionResults.processed_image_url && (
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="subtitle1" gutterBottom>
                Processed Image with Detections:
              </Typography>
              <img
                src={`http://localhost:5000${detectionResults.processed_image_url}`}
                alt="Processed"
                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
              />
            </Box>
          )}

          {Array.isArray(detectionResults.analysis) && detectionResults.analysis.length > 0 ? (
            <Grid container spacing={3}>
              {detectionResults.analysis.map((analysis, index) => (
                <React.Fragment key={index}>
                  {renderAnalysis(analysis)}
                </React.Fragment>
              ))}
            </Grid>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No weapons detected in the image.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ImageDetection; 