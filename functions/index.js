const functions = require('firebase-functions');
const admin = require('firebase-admin');
const ytdl = require('ytdl-core');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// YouTube video extraction endpoint
exports.extractVideo = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    try {
      const videoId = req.query.videoId || req.body.videoId;

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
      const mp4Formats = formats.filter(f => f.container === 'mp4' || f.hasVideo && f.hasAudio);
      
      if (mp4Formats.length === 0) {
        // Fallback to best available format
        const bestFormat = ytdl.chooseFormat(info.formats, {
          quality: 'highest',
          filter: 'audioandvideo'
        });

        return res.json({
          videoId: videoId,
          title: info.videoDetails.title,
          duration: parseInt(info.videoDetails.lengthSeconds),
          formats: [{
            itag: bestFormat.itag,
            url: bestFormat.url,
            quality: bestFormat.qualityLabel || bestFormat.quality,
            container: bestFormat.container || 'mp4',
            hasVideo: bestFormat.hasVideo,
            hasAudio: bestFormat.hasAudio
          }]
        });
      }

      // Sort by quality and get best MP4
      const bestMp4 = mp4Formats
        .sort((a, b) => {
          const aQuality = parseInt(a.qualityLabel || '0');
          const bQuality = parseInt(b.qualityLabel || '0');
          return bQuality - aQuality;
        })[0];

      // If no video+audio format, try to get separate video and audio
      if (!bestMp4.hasAudio) {
        const audioFormat = ytdl.chooseFormat(info.formats, {
          quality: 'highestaudio'
        });

        return res.json({
          videoId: videoId,
          title: info.videoDetails.title,
          duration: parseInt(info.videoDetails.lengthSeconds),
          formats: [{
            itag: bestMp4.itag,
            url: bestMp4.url,
            quality: bestMp4.qualityLabel || bestMp4.quality,
            container: bestMp4.container || 'mp4',
            hasVideo: true,
            hasAudio: false
          }],
          audioFormat: audioFormat ? {
            itag: audioFormat.itag,
            url: audioFormat.url,
            hasAudio: true
          } : null
        });
      }

      return res.json({
        videoId: videoId,
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds),
        formats: [{
          itag: bestMp4.itag,
          url: bestMp4.url,
          quality: bestMp4.qualityLabel || bestMp4.quality,
          container: bestMp4.container || 'mp4',
          hasVideo: bestMp4.hasVideo,
          hasAudio: bestMp4.hasAudio
        }]
      });

    } catch (error) {
      console.error('Error extracting video:', error);
      return res.status(500).json({
        error: error.message || 'Failed to extract video information'
      });
    }
  });
});

// Health check endpoint
exports.health = functions.https.onRequest((req, res) => {
  return cors(req, res, () => {
    res.json({ status: 'ok', service: 'ymp4-functions' });
  });
});
