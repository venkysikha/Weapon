import React, { useState } from 'react';
import { 
    Box, 
    Button, 
    Typography, 
    Paper, 
    Alert, 
    CircularProgress,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Divider
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const ImageDetection = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [detectionResults, setDetectionResults] = useState(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Please select an image first');
            return;
        }

        setIsProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await axios.post('http://localhost:5000/api/image/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                setDetectionResults(response.data);
            } else {
                setError(response.data.error || 'Failed to process image');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error processing image');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderDetectionSummary = () => {
        if (!detectionResults?.analysis?.length) return null;

        const weaponTypes = detectionResults.analysis.reduce((acc, detection) => {
            const type = detection.class;
            if (!acc[type]) {
                acc[type] = {
                    count: 0,
                    totalConfidence: 0,
                    maxConfidence: 0
                };
            }
            acc[type].count++;
            acc[type].totalConfidence += detection.confidence;
            acc[type].maxConfidence = Math.max(acc[type].maxConfidence, detection.confidence);
            return acc;
        }, {});

        const chartData = Object.entries(weaponTypes).map(([type, data]) => ({
            name: type,
            count: data.count,
            avgConfidence: (data.totalConfidence / data.count).toFixed(2),
            maxConfidence: data.maxConfidence.toFixed(2)
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
                                    {Object.entries(weaponTypes).map(([type, data]) => (
                                        <React.Fragment key={type}>
                                            <ListItem>
                                                <ListItemText
                                                    primary={type}
                                                    secondary={`Count: ${data.count} | Avg Confidence: ${(data.totalConfidence / data.count).toFixed(2)} | Max Confidence: ${data.maxConfidence.toFixed(2)}`}
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
                                    Confidence Distribution
                                </Typography>
                                <Box sx={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="avgConfidence" name="Average Confidence" fill="#8884d8" />
                                            <Bar dataKey="maxConfidence" name="Max Confidence" fill="#82ca9d" />
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

    const renderWeaponAnalysis = () => {
        if (!detectionResults?.analysis?.length) return null;

        return (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom>
                    Detailed Analysis
                </Typography>
                <Grid container spacing={3}>
                    {detectionResults.analysis.map((detection, index) => (
                        <Grid item xs={12} md={6} key={index}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {detection.class} (Confidence: {(detection.confidence * 100).toFixed(2)}%)
                                    </Typography>
                                    <Typography variant="body1" paragraph>
                                        <strong>Description:</strong> {detection.weapon_info?.description || 'No description available'}
                                    </Typography>
                                    <Typography variant="body1" paragraph>
                                        <strong>Risk Assessment:</strong> {detection.weapon_info?.risk_assessment || 'No risk assessment available'}
                                    </Typography>
                                    {detection.weapon_info?.recommended_actions?.length > 0 && (
                                        <>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Recommended Actions:
                                            </Typography>
                                            <List dense>
                                                {detection.weapon_info.recommended_actions.map((action, i) => (
                                                    <ListItem key={i}>
                                                        <ListItemText primary={action} />
                                                    </ListItem>
                                                ))}
                                            </List>
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
                Image Weapon Detection
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload"
                    type="file"
                    onChange={handleFileSelect}
                />
                <label htmlFor="image-upload">
                    <Button variant="contained" component="span">
                        Select Image
                    </Button>
                </label>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpload}
                    disabled={!selectedFile || isProcessing}
                    sx={{ ml: 2 }}
                >
                    {isProcessing ? <CircularProgress size={24} /> : 'Upload and Detect'}
                </Button>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {previewUrl && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Selected Image:
                    </Typography>
                    <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                    />
                </Box>
            )}

            {detectionResults?.processed_image_url && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Processed Image:
                    </Typography>
                    <img
                        src={`http://localhost:5000${detectionResults.processed_image_url}`}
                        alt="Processed"
                        style={{ maxWidth: '100%', maxHeight: '400px' }}
                    />
                </Box>
            )}

            {renderDetectionSummary()}
            {renderWeaponAnalysis()}
        </Box>
    );
};

export default ImageDetection; 