const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('video_annotations', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    clip_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    surgical_video_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'surgical_videos',
        key: 'id'
      }
    },
    annotation_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    duration: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    fps: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    start_time: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    end_time: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    video_path: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    step: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    criterion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    label_processed: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'video_annotations',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "video_annotations_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
