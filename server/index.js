const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(express.json());

// MongoDB connection (optional - for storing download history)
let db = null;
if (process.env.MONGODB_URI) {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  
  client.connect()
    .then(() => {
      console.log('Connected to MongoDB Atlas');
      db = client.db('ymp4');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Continuing without database...');
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ymp4-api',
    timestamp: new Date().toISOString()
  });
});

// Extract video information endpoint
app.get('/api/extract', async (req, res) => {
  try {
    const videoId = req.query.videoId;

    if (!videoId) {
      return res.status(400).json({
        error: 'Video ID is required'
      });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Validate YouTube URL
    if (!ytdl.validateURL(videoUrl)) {
      return res.status(400).json({
        error: 'Invalid YouTube URL'
      });
    }

    // Get video info
    const info = await ytdl.getInfo(videoUrl);

    // Find best quality MP4 format
    const formats = ytdl.filterFormats(info.formats, 'videoonly');
    const mp4Formats = formats.filter(f => 
      f.container === 'mp4' || (f.hasVideo && f.hasAudio)
    );

    let bestFormat;
    
    if (mp4Formats.length > 0) {
      // Sort by quality and get best MP4
      bestFormat = mp4Formats.sort((a, b) => {
        const aQuality = parseInt(a.qualityLabel || '0');
        const bQuality = parseInt(b.qualityLabel || '0');
        return bQuality - aQuality;
      })[0];
    } else {
      // Fallback to best available format
      bestFormat = ytdl.chooseFormat(info.formats, {
        quality: 'highest',
        filter: 'audioandvideo'
      });
    }

    // If no audio in format, try to get separate audio
    let audioFormat = null;
    if (bestFormat && !bestFormat.hasAudio) {
      try {
        audioFormat = ytdl.chooseFormat(info.formats, {
          quality: 'highestaudio'
        });
      } catch (err) {
        console.warn('Could not get audio format:', err);
      }
    }

    const result = {
      videoId: videoId,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails[0]?.url || null,
      formats: [{
        itag: bestFormat.itag,
        url: bestFormat.url,
        quality: bestFormat.qualityLabel || bestFormat.quality,
        container: bestFormat.container || 'mp4',
        hasVideo: bestFormat.hasVideo,
        hasAudio: bestFormat.hasAudio
      }]
    };

    if (audioFormat) {
      result.audioFormat = {
        itag: audioFormat.itag,
        url: audioFormat.url,
        hasAudio: true
      };
    }

    // Store download record in MongoDB (optional)
    if (db) {
      try {
        await db.collection('downloads').insertOne({
          videoId: videoId,
          title: info.videoDetails.title,
          timestamp: new Date(),
          ip: req.ip || req.connection.remoteAddress
        });
      } catch (err) {
        console.error('Failed to store download record:', err);
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Error extracting video:', error);
    res.status(500).json({
      error: error.message || 'Failed to extract video information'
    });
  }
});

// Get download statistics (optional - requires MongoDB)
app.get('/api/stats', async (req, res) => {
  if (!db) {
    return res.status(503).json({
      error: 'Database not configured'
    });
  }

  try {
    const totalDownloads = await db.collection('downloads').countDocuments();
    const recentDownloads = await db.collection('downloads')
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    res.json({
      totalDownloads,
      recentDownloads: recentDownloads.map(d => ({
        videoId: d.videoId,
        title: d.title,
        timestamp: d.timestamp
      }))
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`YMP4 API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
