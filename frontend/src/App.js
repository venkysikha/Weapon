import React, { useState } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
} from '@mui/material';
import ImageDetection from './components/ImageDetection';
import VideoDetection from './components/VideoDetection';

function App() {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Weapon Detection System
                </Typography>

                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} centered>
                        <Tab label="Image Detection" />
                        <Tab label="Video Detection" />
                    </Tabs>
                </Paper>

                {activeTab === 0 ? <ImageDetection /> : <VideoDetection />}
            </Box>
        </Container>
    );
}

export default App; 