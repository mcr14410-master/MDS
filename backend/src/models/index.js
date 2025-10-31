const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'fertigungsdaten',
  process.env.DB_USER || 'fms_user',
  process.env.DB_PASSWORD || 'fms_password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Models importieren
const Bauteil = require('./bauteil')(sequelize);
const NcProgramm = require('./ncProgramm')(sequelize);
const Einrichteblatt = require('./einrichteblatt')(sequelize);
const Werkzeug = require('./werkzeug')(sequelize);
const Aufspannfoto = require('./aufspannfoto')(sequelize);

// Relationen definieren
Bauteil.hasMany(NcProgramm, { foreignKey: 'bauteilId', as: 'ncProgramme' });
NcProgramm.belongsTo(Bauteil, { foreignKey: 'bauteilId', as: 'bauteil' });

Bauteil.hasMany(Einrichteblatt, { foreignKey: 'bauteilId', as: 'einrichteblaetter' });
Einrichteblatt.belongsTo(Bauteil, { foreignKey: 'bauteilId', as: 'bauteil' });

Bauteil.hasMany(Aufspannfoto, { foreignKey: 'bauteilId', as: 'aufspannfotos' });
Aufspannfoto.belongsTo(Bauteil, { foreignKey: 'bauteilId', as: 'bauteil' });

module.exports = {
  sequelize,
  Bauteil,
  NcProgramm,
  Einrichteblatt,
  Werkzeug,
  Aufspannfoto
};
