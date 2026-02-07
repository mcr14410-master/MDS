/* eslint-disable camelcase */

/**
 * Terminal API-Key Authentifizierung
 * 
 * Jedes Terminal bekommt einen API-Key für sichere Kommunikation.
 * Key wird bei Terminal-Registrierung generiert und in config.yaml hinterlegt.
 */

exports.shorthands = undefined;

exports.up = pgm => {
  // API-Key für Terminal-Authentifizierung
  pgm.addColumn('time_terminals', {
    api_key: { 
      type: 'varchar(64)', 
      unique: true 
    }
  });

  // Typ des Terminals (für spätere verschiedene Terminal-Arten)
  pgm.addColumn('time_terminals', {
    terminal_type: { 
      type: 'varchar(30)', 
      default: 'time_clock',
      notNull: true
    }
  });

  pgm.sql(`
    COMMENT ON COLUMN time_terminals.api_key IS 'API-Key für Terminal-Authentifizierung (in config.yaml auf dem Terminal)';
    COMMENT ON COLUMN time_terminals.terminal_type IS 'Terminal-Typ: time_clock, tool, measurement, machine';
  `);
};

exports.down = pgm => {
  pgm.dropColumn('time_terminals', 'terminal_type');
  pgm.dropColumn('time_terminals', 'api_key');
};
