const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bauteil = sequelize.define('Bauteil', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    zeichnungsnummer: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    benennung: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    revision: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    material: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    kunde: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    notizen: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('aktiv', 'inaktiv', 'archiviert'),
      defaultValue: 'aktiv'
    }
  }, {
    tableName: 'bauteile',
    timestamps: true,
    indexes: [
      {
        fields: ['zeichnungsnummer']
      },
      {
        fields: ['kunde']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Bauteil;
};
