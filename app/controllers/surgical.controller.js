const db = require("../models");
const config = require("../config/auth.config");
const SurgicalVideo = db.surgical_videos;
const {successResponse,errorResponse} = require('../common/response');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// Multer setup for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir);
        }
        cb(null, uploadsDir);
      },
    filename: (req, file, cb) => {
      // Remove spaces and replace them with hyphens
      const fileName = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
      cb(null, fileName);
    },
  });
  
  const upload = multer({
    storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100 MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['video/mp4', 'video/avi', 'video.mov', 'video/mkv','video/quicktime'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only video files are allowed.'));
      }
    },
  }).single('video_file');
  
  // API to save surgical videos
  exports.save_surgical_videos = async (req, res) => {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      const {
        surgeon_name,
        date_performed,
        time,
        duration,
        procedure_type,
        surgeon_type,
        ml_model_type,
      } = req.body;
  
      const video_url = req.file ? `uploads/${req.file.filename}` : null;
  
      // Validate required fields
      if (!surgeon_name || !date_performed || !procedure_type || !surgeon_type || !video_url) {
        return res.status(400).json(errorResponse("Missing required fields"));
      }
  
      try {
        const surgicalVideo = await SurgicalVideo.create({
          user_id : req.userId,  
          surgeon_name,
          date_performed,
          time,
          duration,
          procedure_type,
          surgeon_type,
          ml_model_type,
          video_url,
        });
    // Return successful response
    return res.json(successResponse(surgicalVideo));
      } catch (err) {
        return res.status(500).json(errorResponse(err.message));
      }
    });
  };