const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Aufspannfoto = sequelize.define('Aufspannfoto', {
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
    aufspannung: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    bildUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    dateiname: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    beschreibung: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'aufspannfotos',
    timestamps: true,
    indexes: [
      {
        fields: ['bauteilId']
      }
    ]
  });

  return Aufspannfoto;
};
