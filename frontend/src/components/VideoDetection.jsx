import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Grid, Card, CardContent, List, ListItem, ListItemText, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

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

const VideoDetection = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'video/mp4' || file.type === 'video/avi' || file.type === 'video/quicktime')) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please upload a valid video file (MP4, AVI, or MOV)');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a video file first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:5000/api/video/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setDetectionResults(response.data);
      } else {
        setError(response.data.error || 'Failed to process video');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error processing video');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderDetectionSummary = () => {
    if (!detectionResults?.detections_summary) return null;

    const weaponTypes = Object.entries(detectionResults.detections_summary).map(([type, data]) => ({
      name: type,
      count: data.count,
      maxConfidence: data.max_confidence,
      framesDetected: data.frames_detected.length
    }));

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Detection Summary
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weapon Statistics
                </Typography>
                <List>
                  {weaponTypes.map((weapon) => (
                    <React.Fragment key={weapon.name}>
                      <ListItem>
                        <ListItemText
                          primary={weapon.name}
                          secondary={`Count: ${weapon.count} | Max Confidence: ${(weapon.maxConfidence * 100).toFixed(2)}% | Frames Detected: ${weapon.framesDetected}`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detection Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weaponTypes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Detection Count" fill="#8884d8" />
                      <Bar dataKey="framesDetected" name="Frames Detected" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderFrameAnalysis = () => {
    if (!detectionResults?.detections_summary) return null;

    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Frame-by-Frame Analysis
        </Typography>
        <Grid container spacing={3}>
          {Object.entries(detectionResults.detections_summary).map(([type, data]) => (
            <Grid item xs={12} md={6} key={type}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {type} Analysis
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Total Detections:</strong> {data.count}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Max Confidence:</strong> {(data.max_confidence * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Frames Detected:</strong> {data.frames_detected.length}
                  </Typography>
                  {data.info && (
                    <>
                      <Typography variant="body1" paragraph>
                        <strong>Description:</strong> {data.info.description || 'No description available'}
                      </Typography>
                      <Typography variant="body1" paragraph>
                        <strong>Risk Assessment:</strong> {data.risk_assessment?.threat_analysis || 'No risk assessment available'}
                      </Typography>
                      {data.risk_assessment?.recommended_actions?.length > 0 && (
                        <>
                          <Typography variant="subtitle1" gutterBottom>
                            Recommended Actions:
                          </Typography>
                          <List dense>
                            {data.risk_assessment.recommended_actions.map((action, i) => (
                              <ListItem key={i}>
                                <ListItemText primary={action} />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Video Weapon Detection
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
        {selectedFile ? (
          <Box sx={{ textAlign: 'center' }}>
            <VideoLibraryIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Typography>
          </Box>
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Drag and drop a video here, or
            </Typography>
            <Button
              component="label"
              variant="contained"
              startIcon={<VideoLibraryIcon />}
            >
              Select Video
              <VisuallyHiddenInput
                type="file"
                accept="video/*"
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
            Total Frames: {detectionResults.total_frames}
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Processed Frames: {detectionResults.processed_frames}
          </Typography>
          
          <Typography variant="subtitle1" gutterBottom>
            Processing Time: {detectionResults.processing_time.toFixed(2)} seconds
          </Typography>

          {renderDetectionSummary()}
          {renderFrameAnalysis()}

          {detectionResults.processed_video_url && (
            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Processed Video
              </Typography>
              <video
                controls
                style={{ width: '100%', maxWidth: '800px' }}
                src={`http://localhost:5000${detectionResults.processed_video_url}`}
              />
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default VideoDetection;