export const RodType = {
  SPINNING: 'SPINNING',
  FEEDER: 'FEEDER',
  FLOAT: 'FLOAT',
  ICE: 'ICE',
  CASTING: 'CASTING',
  OTHER: 'OTHER',
} as const;
export type RodType = (typeof RodType)[keyof typeof RodType];

export const ReelType = {
  SPINNING: 'SPINNING',
  BAITCASTING: 'BAITCASTING',
  ICE: 'ICE',
  OTHER: 'OTHER',
} as const;
export type ReelType = (typeof ReelType)[keyof typeof ReelType];

export const LineType = {
  BRAID: 'BRAID',
  MONO: 'MONO',
  FLUOROCARBON: 'FLUOROCARBON',
} as const;
export type LineType = (typeof LineType)[keyof typeof LineType];

export const BoatType = {
  PVC: 'PVC',
  RIB: 'RIB',
  ALUMINIUM: 'ALUMINIUM',
  PLASTIC: 'PLASTIC',
  OTHER: 'OTHER',
} as const;
export type BoatType = (typeof BoatType)[keyof typeof BoatType];

/** Тип элемента каталога снастей. */
export const GearCatalogType = {
  ROD: 'ROD',
  REEL: 'REEL',
  LINE: 'LINE',
  LEADER: 'LEADER',
  LURE: 'LURE',
  BOAT: 'BOAT',
  MOTOR: 'MOTOR',
} as const;
export type GearCatalogType = (typeof GearCatalogType)[keyof typeof GearCatalogType];
