const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

console.log('Setting paths...');
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

console.log('Testing ffmpeg...');
ffmpeg.getAvailableCodecs((err, codecs) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Success! FFmpeg is working.');
  console.log('AAC codec available:', !!codecs['aac']);
  console.log('MP3 codec available:', !!codecs['libmp3lame']);
  process.exit(0);
});
