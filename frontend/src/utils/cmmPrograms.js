// Dateiname des ZIP-Downloads eines Messprogramms (wie vom Backend vorgeschlagen)
export const cmmZipName = (program, version) =>
  `${[program.part_number, program.program_number, `v${version}`].filter(Boolean).join('_')}.zip`;
