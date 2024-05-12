const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('surgical_videos_detail', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    surgical_video_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'surgical_videos',
        key: 'id'
      }
    },
    surgeon_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    surgeon_type: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'surgical_videos_detail',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "surgical_videos_detail_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
