export const LANE_WIDTH = 3.6;
export const LANE_POSITIONS: readonly [number, number, number] = [
  -LANE_WIDTH,
  0,
  LANE_WIDTH,
];

export const ROAD_WIDTH = 12.4;
export const SEGMENT_LENGTH = 36;
export const SEGMENT_COUNT = 13;
export const DESPAWN_Z = 22;
export const SPAWN_Z = -340;

export const PLAYER_Z = 0;
export const PLAYER_HOVER_Y = 0;
export const CAR_CHASSIS_CLEARANCE = 0.24;

export const BASE_START_SPEED = 34;
export const BASE_MAX_SPEED = 108;
export const THROTTLE_BONUS = 9;
export const BRAKE_PENALTY = 9;
export const BOOST_SPEED_BONUS = 22;
export const PAD_BOOST_BONUS = 26;

export const SPEED_TO_KMH = 3.6;

export const BOOST_MAX = 100;
export const BOOST_DRAIN_PER_SEC = 28;
export const BOOST_PASSIVE_REGEN_PER_SEC = 4.5;
export const BOOST_MIN_ACTIVATION = 15;
export const PAD_BOOST_DURATION = 1.35;

export const SCORE_PER_METER = 2.4;
export const ENERGY_ORB_SCORE = 120;
export const SCORE_CRYSTAL_VALUE = 300;
export const BOOST_CELL_SCORE = 150;
export const NEAR_MISS_SCORE = 85;
export const COMBO_DURATION = 4.2;
export const MAX_MULTIPLIER = 8;

export const ORB_COIN_VALUE = 1;
export const CELL_COIN_VALUE = 1;
export const GOLD_COIN_VALUE = 3;

export const COLORS = {
  bgVoid: 0xf2a582,
  fogNight: 0xdf979c,
  roadAsphalt: 0x2b2d36,
  neonCyan: 0x2dd4bf,
  electricBlue: 0x60a5fa,
  neonPurple: 0xa78bfa,
  neonMagenta: 0xf472b6,
  dangerRed: 0xfb7185,
  energyAmber: 0xfbbf24,
  whiteHot: 0xfef3c7,
} as const;
