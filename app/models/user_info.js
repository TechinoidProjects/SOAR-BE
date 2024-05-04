const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('user_info', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    institution_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    surgical_experience_level: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    year_of_clinical_residency: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    years_of_clinical_experience: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    surgical_sub_speciality: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'user_info',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "user_info_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
