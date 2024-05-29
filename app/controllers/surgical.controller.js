const db = require("../models");
const config = require("../config/auth.config");
const SurgicalVideo = db.surgical_videos;
const SurgicalVideoDetail = db.surgical_videos_detail;
const User = db.users;
const UserInfo = db.user_info;
const VideoAnnotations = db.video_annotations;
const { successResponse, errorResponse } = require('../common/response');
const fs = require('fs');
const path = require('path');
const { s3Client } = require('../middleware/s3Client');
const { upload } = require('../middleware/uploadMiddleware');
const multer = require('multer');
const { QueryTypes } = require('sequelize');
require('dotenv').config();

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
    };

    // Uploading files to the bucket
    try {
      const command = new PutObjectCommand(params);
      await s3Client.send(command);

      // Construct the video URL
      const videoUrl = `https://${params.Bucket}.s3.${s3Client.config.region}.amazonaws.com/${params.Key}`;

      // Save surgical video data
      const surgicalVideo = await SurgicalVideo.create({
        user_id: req.userId,
        date_performed: datePerformed,
        time,
        duration,
        procedure_type: typeOfProcedure,
        ml_model_type: modelType,
        video_url: videoUrl,
      });

      // Save each surgeon's details
      if (surgeonAll && surgeonAll.length) {
        await Promise.all(surgeonAll.map(surgeon =>
          SurgicalVideoDetail.create({
            surgical_video_id: surgicalVideo.id,
            surgeon_name: surgeon.nameOfSurgeon,
            surgeon_type: surgeon.typeOfSurgeon,
          })
        ));
      }

      // Return successful response
      return res.json({ success: true, message: 'Data uploaded successfully!' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      // Optionally, delete the file from the local file system
      fs.unlinkSync(file.path);
    }
  });
};

exports.search_surgical_videos = async (req, res) => {
  const { procedure_type, surgeon, years_of_experience, durations, hospital, datePerformed, time_of_surgery,steps,errors,criterias,scores } = req.body;
  // Check if any filters are provided
  const isFiltered = procedure_type || surgeon || years_of_experience || durations || hospital || datePerformed || time_of_surgery || steps || errors || criterias || scores;
  if (!isFiltered) {
    // No filters provided, fetch default video list
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: 'user',
          include: [{
            model: UserInfo,
            as: 'user_infos', // Assuming 'user_infos' is correctly setup to fetch multiple or single UserInfo
            attributes: ['institution_name']
          }],
          attributes: ['username'] // Only fetch username from User
        },
        {
          model: SurgicalVideoDetail,
          as: 'surgical_videos_details',
          attributes: ['surgeon_name'] // Fetch surgeon name from SurgicalVideoDetail
        }
      ],
      attributes: ['id','duration', 'time', 'video_url','procedure_type'], // Attributes from SurgicalVideo
    });

    // Enhance response with video_title and filtered attributes
    const enhancedVideos = surgicalVideos.map(video => ({
      id: video.id,
      video_title: video?.procedure_type,
      institution_name: video?.user?.user_infos[0]?.institution_name, // Accessing first UserInfo
      surgeon_name: video.surgical_videos_details.map(detail => detail.surgeon_name).join(', '), // Joining all surgeon names
      duration: video.duration,
      time: video.time,
      video_url: video.video_url
    }));

    return res.json(successResponse(enhancedVideos));
  }
  else {
    // Prepare parameters for the stored procedure call
    const params = [
      `'${procedure_type}'`,
      `'${surgeon}'`,
      `'${years_of_experience}'`,
      durations ? `'${durations}'` : 'NULL',
      `'${hospital}'`,
      datePerformed ? `'${datePerformed}'` : 'NULL',
      time_of_surgery ? `'${time_of_surgery}'` : 'NULL',
      `'${steps}'`,
      `'${errors}'`,
      `'${criterias}'`,
      scores ? `'${scores}'` : 'NULL',
    ].join(',');

    const query = `CALL get_surgical_videos(${params}, 'rs_resultone'); FETCH ALL FROM "rs_resultone";`;

    db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT })
      .then(result => {
        result.splice(0, 1);
        return res.json(successResponse(result));
      })
      .catch(error => {
        return res.status(500).json(errorResponse(error.message));
      });
  }
};


function processAnnotations(annotations, filterLabel = null) {
  const uniqueAnnotations = new Map();

  annotations.forEach(annotation => {
    // If label_processed is null, set it to label
    if (!annotation.label_processed) {
      annotation.label_processed = annotation.label;
    }
    // Check if we should filter this label and if it matches the filter criteria
    if (filterLabel && annotation.label_processed === filterLabel) {
      return; // Skip this annotation
    }
    if (!uniqueAnnotations.has(annotation.label)) {
      uniqueAnnotations.set(annotation.label, annotation);
    }
  });

  // Convert the map values back to an array
  const processedAnnotations = Array.from(uniqueAnnotations.values());

  processedAnnotations.forEach(annotation => {
    const startTime = parseTime(annotation.start_time);
    const endTime = parseTime(annotation.end_time);

    // Check if startTime and endTime are valid dates
    if (!startTime || !endTime) {
      console.warn(`Invalid time format for annotation: ${JSON.stringify(annotation)}`);
      return; // Skip this annotation
    }

    // Calculate duration in seconds
    const duration = (endTime - startTime) / 1000;

    // Check if duration is less than 10 seconds
    if (duration < 10) {
      // If less than 10 seconds, set duration to 10 seconds
      annotation.end_time = addSecondsToTime(annotation.start_time, 10);
    } else {
      // If greater than or equal to 10 seconds, leave it as is
      annotation.end_time = addSecondsToTime(annotation.start_time, duration);
    }
  });

  return processedAnnotations;
}

function parseTime(timeString) {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return null; // Invalid time format
  }

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

function addSecondsToTime(timeString, secondsToAdd) {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return timeString; // Invalid time format
  }

  let totalSeconds = hours * 3600 + minutes * 60 + seconds + secondsToAdd;

  let newHours = Math.floor(totalSeconds / 3600) % 24;
  totalSeconds %= 3600;
  let newMinutes = Math.floor(totalSeconds / 60);
  let newSeconds = totalSeconds % 60;

  return `${newHours < 10 ? '0' + newHours : newHours}:${newMinutes < 10 ? '0' + newMinutes : newMinutes}:${newSeconds < 10 ? '0' + newSeconds : newSeconds}`;
}

exports.get_csv_data_ById = async (req, res) => {
  try {
    const videoId = req.params.id;
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: 'user',
          include: [{
            model: UserInfo,
            as: 'user_infos',
            attributes: ['institution_name']
          }],
          attributes: ['username']
        },
        {
          model: SurgicalVideoDetail,
          as: 'surgical_videos_details',
          attributes: ['surgeon_name']
        },
        {
          model: VideoAnnotations,
          as: 'video_annotations',
        }
      ],
      attributes: ['id', 'duration', 'time', 'video_url'],
      where: { id: videoId }
    });

    const [enhancedVideos] = surgicalVideos.map(video => {
      const steps = processAnnotations(video.video_annotations.filter(annotation => annotation.annotation_type === 'steps'));
      const errors = processAnnotations(video.video_annotations.filter(annotation => annotation.annotation_type === 'errors'), "Instrument tip out of view");
      const competency = processAnnotations(video.video_annotations.filter(annotation => annotation.annotation_type === null));

      const csv_data = [{competency: competency}, { steps: steps }, {errors: errors}];

      return {
        id: video.id,
        video_title: 'Cystoscopy Video',
        institution_name: video?.user?.user_infos[0]?.institution_name,
        surgeon_name: video.surgical_videos_details.map(detail => detail.surgeon_name).join(', '),
        duration: video.duration,
        time: video.time,
        video_url: video.video_url,
        csv_data: csv_data
      };
    });

    return res.json({ success: true, data: enhancedVideos });

  } catch (err) {
    console.error("Fetching surgical video data failed:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};


exports.search_surgical_videos_by_userId = async (req, res) => {
  
  const userId = req.userId;

  const { procedure_type, surgeon, years_of_experience, durations, hospital, datePerformed, time_of_surgery,steps,errors,criterias,scores } = req.body;
  // Check if any filters are provided
  const isFiltered = procedure_type || surgeon || years_of_experience || durations || hospital || datePerformed || time_of_surgery || steps || errors || criterias || scores;
  if (!isFiltered) {
    // No filters provided, fetch default video list
    const surgicalVideos = await SurgicalVideo.findAll({
      include: [
        {
          model: User,
          as: 'user',
          include: [{
            model: UserInfo,
            as: 'user_infos', // Assuming 'user_infos' is correctly setup to fetch multiple or single UserInfo
            attributes: ['institution_name']
          }],
          attributes: ['username'] // Only fetch username from User
        },
        {
          model: SurgicalVideoDetail,
          as: 'surgical_videos_details',
          attributes: ['surgeon_name'] // Fetch surgeon name from SurgicalVideoDetail
        }
      ],
      attributes: ['id','duration', 'time', 'video_url','procedure_type'], // Attributes from SurgicalVideo
      where: { user_id: userId }
    });

    // Enhance response with video_title and filtered attributes
    const enhancedVideos = surgicalVideos.map(video => ({
      user_id : userId,
      id: video.id,
      video_title: video?.procedure_type,
      institution_name: video?.user?.user_infos[0]?.institution_name, // Accessing first UserInfo
      surgeon_name: video.surgical_videos_details.map(detail => detail.surgeon_name).join(', '), // Joining all surgeon names
      duration: video.duration,
      time: video.time,
      video_url: video.video_url
    }));

    return res.json(successResponse(enhancedVideos));
  }
  else {
    // Prepare parameters for the stored procedure call
    const params = [
      `'${userId}'`,
      `'${procedure_type}'`,
      `'${surgeon}'`,
      `'${years_of_experience}'`,
      durations ? `'${durations}'` : 'NULL',
      `'${hospital}'`,
      datePerformed ? `'${datePerformed}'` : 'NULL',
      time_of_surgery ? `'${time_of_surgery}'` : 'NULL',
      `'${steps}'`,
      `'${errors}'`,
      `'${criterias}'`,
      scores ? `'${scores}'` : 'NULL',
    ].join(',');

    const query = `CALL get_surgical_videos_by_userId(${params}, 'rs_resultone'); FETCH ALL FROM "rs_resultone";`;

    db.sequelize.query(query, { type: db.sequelize.QueryTypes.SELECT })
      .then(result => {
        result.splice(0, 1);
        return res.json(successResponse(result));
      })
      .catch(error => {
        return res.status(500).json(errorResponse(error.message));
      });
  }
};