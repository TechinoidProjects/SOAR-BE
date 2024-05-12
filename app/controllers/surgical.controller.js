const db = require("../models");
const config = require("../config/auth.config");
const SurgicalVideo = db.surgical_videos;
const SurgicalVideoDetail = db.surgical_videos_detail;
const {successResponse,errorResponse} = require('../common/response');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const multer = require('multer');
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  secretAccessKey: 'XtDRyqTSNrVg+WK8gCUA9sJYnXEd1AZim8kAHFp7',
  accessKeyId: 'AKIAXYKJRUCMUTWCJSHZ',
  region: 'eu-north-1'  // example: 'us-west-2'
});

const s3 = new AWS.S3();

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
        surgeons,
        datePerformed,
        time,
        duration,
        typeOfProcedure,
        modelType,
      } = req.body;
  
      const surgeonAll = surgeons ? JSON.parse(surgeons) : [];

      const file = req.file;
    
      // Read the file from local file system
      const fileStream = fs.readFileSync(file.path);

      // Setting up S3 upload parameters
    const params = {
      Bucket: 'soarbackend',
      Key: `videos/${Date.now()}-${file.originalname}`,  // File name you want to save as in S3
      Body: fileStream,
      // ACL: 'public-read'
  };

   // Uploading files to the bucket
 
      try {
        const uploadVideo = await s3.upload(params).promise();
        if(uploadVideo){
       // Save surgical video data
        const surgicalVideo = await SurgicalVideo.create({
          user_id : req.userId,  
          date_performed : datePerformed,
          time : time,
          duration : duration,
          procedure_type : typeOfProcedure,
          ml_model_type : modelType,
          video_url : uploadVideo?.Location,
        });

         // Save each surgeon's details
         if (surgeonAll && surgeonAll.length) {
          await Promise.all(surgeonAll?.map(surgeon =>
              SurgicalVideoDetail.create({
                  surgical_video_id: surgicalVideo.id,
                  surgeon_name: surgeon.nameOfSurgeon,
                  surgeon_type: surgeon.typeOfSurgeon
              })
          ));
      }

    // Return successful response
    return res.json(successResponse('Data uploaded successfully!'));
    }else{
    return res.status(400).json(errorResponse("Video is not uploaded."));
    }
      } catch (err) {
        return res.status(500).json(errorResponse(err.message));
      }
    });
  };

  // API to get surgical videos
  exports.get_surgical_videos = async (req, res) => {
    try {
        const surgicalVideos = await SurgicalVideo.findAll();
        return res.json(successResponse(surgicalVideos));
      } catch (err) {
        return res.status(500).json(errorResponse(err.message));
      }
  };