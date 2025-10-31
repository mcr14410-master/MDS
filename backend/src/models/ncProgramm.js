const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NcProgramm = sequelize.define('NcProgramm', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bauteilId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bauteile',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    programmname: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    bearbeitungsschritt: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    maschine: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    programmcode: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dateipfad: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: 'nc_programme',
    timestamps: true,
    indexes: [
      {
        fields: ['bauteilId']
      },
      {
        fields: ['programmname']
      }
    ]
  });

  return NcProgramm;
};
