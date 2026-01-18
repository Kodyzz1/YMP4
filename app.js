// YMP4 - YouTube to MP4 Converter
// Uses Render API for server-side video extraction

class YMP4Converter {
    constructor() {
        this.videoBlob = null;
        this.videoUrl = null;
        this.apiUrl = null; // Will be set to Render API URL
        this.init();
    }

    init() {
        const convertBtn = document.getElementById('convertBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const youtubeUrlInput = document.getElementById('youtubeUrl');

        convertBtn.addEventListener('click', () => this.handleConvert());
        downloadBtn.addEventListener('click', () => this.handleDownload());
        
        youtubeUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleConvert();
            }
        });
    }

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    updateProgress(percent, text) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressText = document.getElementById('progressText');

        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
        if (text) {
            progressText.textContent = text;
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    async handleConvert() {
        const urlInput = document.getElementById('youtubeUrl');
        const url = urlInput.value.trim();
        const convertBtn = document.getElementById('convertBtn');

        if (!url) {
            this.showError('Please enter a YouTube URL');
            return;
        }

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.showError('Invalid YouTube URL. Please check and try again.');
            return;
        }

        // Hide download section, show progress
        document.getElementById('downloadSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('videoInfo').style.display = 'none';
        this.hideError();

        convertBtn.disabled = true;
        urlInput.disabled = true;

        try {
            this.updateProgress(10, 'Fetching video information...');

            const videoInfo = await this.getVideoInfo(videoId);
            
            this.updateProgress(30, 'Preparing download...');
            
            document.getElementById('videoTitle').textContent = videoInfo.title || 'Unknown';
            document.getElementById('videoDuration').textContent = videoInfo.duration || 'Unknown';
            document.getElementById('videoQuality').textContent = videoInfo.quality || 'Best available';
            document.getElementById('videoInfo').style.display = 'block';

            this.updateProgress(50, 'Extracting video stream...');
            
            await this.downloadVideo(videoId, videoInfo);
            
            this.updateProgress(100, 'Conversion complete!');
            
            setTimeout(() => {
                document.getElementById('downloadSection').style.display = 'block';
            }, 500);

        } catch (error) {
            console.error('Conversion error:', error);
            this.showError(`Conversion failed: ${error.message}`);
            document.getElementById('progressSection').style.display = 'none';
        } finally {
            convertBtn.disabled = false;
            urlInput.disabled = false;
        }
    }

    async getVideoInfo(videoId) {
        try {
            // Get video info from Render API
            const apiUrl = await this.getApiUrl();
            const response = await fetch(`${apiUrl}/api/extract?videoId=${encodeURIComponent(videoId)}`);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to fetch video information' }));
                throw new Error(error.error || 'Failed to fetch video information');
            }
            
            const data = await response.json();
            
            return {
                title: data.title || 'Unknown',
                duration: data.duration ? this.formatDuration(data.duration) : 'Unknown',
                quality: data.formats && data.formats[0] ? data.formats[0].quality : 'Best available',
                videoData: data // Store full data for download
            };
        } catch (error) {
            console.error('Error getting video info:', error);
            // Fallback to oEmbed if API fails
            try {
                const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
                const response = await fetch(oEmbedUrl);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        title: data.title || 'Unknown',
                        duration: 'Unknown',
                        quality: 'Best available'
                    };
                }
            } catch (e) {}
            
            throw error;
        }
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    async getApiUrl() {
        // Get Render API URL
        // For local development, use local server
        // For production, use deployed Render service URL
        if (this.apiUrl) {
            return this.apiUrl;
        }
        
        // Check if API URL is set in config
        if (window.API_URL) {
            this.apiUrl = window.API_URL;
            return this.apiUrl;
        }
        
        // Check if we're in development (localhost)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Use local development server
            this.apiUrl = 'http://localhost:3000';
        } else {
            // Use deployed Render service
            // Set this in config.js or update with your Render service URL
            // Format: https://your-service-name.onrender.com
            this.apiUrl = 'https://your-ymp4-api.onrender.com'; // Update with your Render service URL
        }
        
        return this.apiUrl;
    }

    async downloadVideo(videoId, videoInfo) {
        try {
            this.updateProgress(60, 'Extracting video stream from server...');
            
            // Get video URL from server (already fetched in getVideoInfo)
            const videoData = videoInfo.videoData;
            
            if (!videoData || !videoData.formats || videoData.formats.length === 0) {
                throw new Error('No video format available');
            }
            
            const format = videoData.formats[0];
            
            if (!format.url) {
                throw new Error('Video URL not available');
            }
            
            this.updateProgress(70, 'Downloading video stream...');
            
            // Download the video with progress tracking
            const blob = await this.downloadVideoStream(format.url, videoId);
            
            this.videoBlob = blob;
            this.videoUrl = URL.createObjectURL(blob);
            
        } catch (error) {
            console.error('Download error:', error);
            throw new Error(`Download failed: ${error.message}`);
        }
    }
    
    async downloadVideoStream(videoUrl, videoId) {
        // Download video stream with progress tracking
        const response = await fetch(videoUrl);
        
        if (!response.ok) {
            throw new Error('Failed to fetch video stream');
        }
        
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            received += value.length;
            
            if (contentLength > 0) {
                const percent = 70 + (received / contentLength) * 25;
                const mbReceived = (received / 1024 / 1024).toFixed(2);
                this.updateProgress(percent, `Downloaded ${mbReceived} MB...`);
            } else {
                // Update progress based on time if content-length is unknown
                const estimatedPercent = 70 + Math.min(95, received / 10485760 * 25); // Estimate based on 10MB chunks
                this.updateProgress(estimatedPercent, `Downloaded ${mbReceived} MB...`);
            }
        }
        
        this.updateProgress(95, 'Finalizing video...');
        
        return new Blob(chunks, { type: 'video/mp4' });
    }

    handleDownload() {
        if (!this.videoUrl) {
            this.showError('No video available to download');
            return;
        }

        const a = document.createElement('a');
        a.href = this.videoUrl;
        
        // Try to get video title for filename
        const title = document.getElementById('videoTitle').textContent || 'video';
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
        a.download = `${safeTitle}-${Date.now()}.mp4`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Initialize the converter when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YMP4Converter();
});
