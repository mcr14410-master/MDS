const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Werkzeug = sequelize.define('Werkzeug', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nummer: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    bezeichnung: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    typ: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'z.B. Fräser, Bohrer, Gewindebohrer'
    },
    durchmesser: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Durchmesser in mm'
    },
    schnittgeschwindigkeit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Vc in m/min'
    },
    vorschub: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Vorschub in mm/U'
    },
    hersteller: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    artikelnummer: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lagerbestand: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    minimalbestand: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'werkzeuge',
    timestamps: true,
    indexes: [
      {
        fields: ['nummer']
      },
      {
        fields: ['typ']
      }
    ]
  });

  return Werkzeug;
};
