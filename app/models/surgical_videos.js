const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('surgical_videos', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    surgeon_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    date_perfomed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    duration: {
      type: DataTypes.TIME,
      allowNull: true
    },
    procedure_type: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    surgeon_type: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'surgical_videos',
    schema: 'public',
    timestamps: true,
    indexes: [
      {
        name: "surgical_videos_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
