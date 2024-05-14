const db = require("../models");
const SurgicalVideo = db.surgical_videos;
const SurgicalVideoDetail = db.surgical_videos_detail;
const UserInfo = db.user_info;
const VideoAnnotations = db.video_annotations;
const { successResponse, errorResponse } = require('../common/response');
require('dotenv').config();
const { Sequelize } = require('sequelize');

exports.getAllLookups = async (req, res) => {
  try {
    // Fetching distinct institution names
    const institutions = await UserInfo.findAll({
      attributes: [
        ['id', 'id'],
        ['institution_name', 'value']
      ],
      group: ['institution_name', 'id'],
      order: [['institution_name', 'ASC']]
    });

    // Fetching distinct years of clinical experience
    const experiences = await UserInfo.findAll({
      attributes: [
        [Sequelize.fn('min', Sequelize.col('id')), 'id'],
        ['years_of_clinical_experience', 'value']
      ],
      group: ['years_of_clinical_experience'],
      order: [['years_of_clinical_experience', 'ASC']]
    });

    // Fetching distinct surgeons
    const surgeonsData = await SurgicalVideoDetail.findAll({
      attributes: [
      [Sequelize.fn('min', Sequelize.col('id')), 'id'],
        ['surgeon_name', 'value']
      ],
      group: ['surgeon_name'],
      order: [['surgeon_name', 'ASC']]
    });

   // Fetching distinct steps
   const stepData = await VideoAnnotations.findAll({
    attributes: [
      [Sequelize.fn('min', Sequelize.col('id')), 'id'],
        ['label', 'value']
    ],
    where: {
        annotation_type: 'steps'  // Filtering to include only records where annotation_type is 'steps'
    },
    group: ['label'],  // Group by label only to ensure distinct labels
    order: [['label', 'ASC']]
});
    // Fetching distinct erros
    const errorData = await VideoAnnotations.findAll({
      attributes: [
          [Sequelize.fn('min', Sequelize.col('id')), 'id'],  // Use an aggregate function to get a single ID per label
          ['label', 'value']
      ],
      where: {
          annotation_type: 'errors'  // Filtering to include only records where annotation_type is 'errors'
      },
      group: ['label'],  // Group by label only to ensure distinct labels
      order: [['label', 'ASC']]
  });
  
    // Fetching distinct erros
    const criteriaData = await VideoAnnotations.findAll({
      attributes: [
          [Sequelize.fn('min', Sequelize.col('id')), 'id'],  // Use an aggregate function to get a single ID per label
          ['criterion', 'value']
      ],
      where: {
        criterion: {
          [Sequelize.Op.ne]: null      // Ensures that criterion is not null
        }
      },
      group: ['criterion'],  // Group by label only to ensure distinct labels
      order: [['criterion', 'ASC']]
  });

   // Fetching distinct erros
   const scoreData = await VideoAnnotations.findAll({
    attributes: [
        [Sequelize.fn('min', Sequelize.col('id')), 'id'],  // Use an aggregate function to get a single ID per label
        ['score', 'value']
    ],
    where: {
      score: {
        [Sequelize.Op.ne]: null      // Ensures that criterion is not null
      }
    },
    group: ['score'],  // Group by label only to ensure distinct labels
    order: [['score', 'ASC']]
});
    
    // Formatting the response with the successResponse function
    const responseData = {
      hospital: institutions.map(item => item.toJSON()),
      years_of_experience: experiences.map(item => item.toJSON()),
      surgeons: surgeonsData.map(item => item.toJSON()),
      steps: stepData.map(item => item.toJSON()),
      errors: errorData.map(item => item.toJSON()),
      criterias: criteriaData.map(item => item.toJSON()),
      scores: scoreData.map(item => item.toJSON()),
    };

    res.status(200).json(successResponse(responseData));
  } catch (err) {
    console.error('Error fetching filter data:', err);
    // Using the errorResponse function for formatting the error
    res.status(500).json(errorResponse(err.message));
  }
};

