import express from 'express';
import { refreshCorsCache } from '../middleware/cors';

const router = express.Router();

// Refresh CORS cache - useful when new domains are added
router.post('/refresh-cors', async (req, res) => {
  try {
    await refreshCorsCache();
    res.json({ 
      success: true, 
      message: 'CORS cache refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing CORS cache:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh CORS cache' 
    });
  }
});

// Get current CORS allowed origins (for debugging)
router.get('/cors-origins', async (req, res) => {
  try {
    // Import the function dynamically to avoid circular dependencies
    const { getAllowedOrigins } = await import('../middleware/cors');
    const origins = await getAllowedOrigins();
    
    res.json({ 
      success: true, 
      origins,
      count: origins.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting CORS origins:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get CORS origins' 
    });
  }
});

export default router; 