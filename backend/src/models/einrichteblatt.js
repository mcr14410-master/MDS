const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Einrichteblatt = sequelize.define('Einrichteblatt', {
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
    arbeitsgang: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    spannmittel: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    nullpunkt: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    werkzeugliste: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    hinweise: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ruestzeit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Rüstzeit in Minuten'
    }
  }, {
    tableName: 'einrichteblaetter',
    timestamps: true,
    indexes: [
      {
        fields: ['bauteilId']
      }
    ]
  });

  return Einrichteblatt;
};
