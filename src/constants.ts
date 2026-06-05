export interface Region {
  code: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  name: string;
}

export interface State {
  code: string;
  name: string;
  regionCode: Region['code'];
}

export const REGIONS: Region[] = [
  { code: 'NORTH', name: 'North' },
  { code: 'WEST', name: 'West' },
  { code: 'SOUTH', name: 'South' },
  { code: 'EAST', name: 'East' },
];

export const STATES: State[] = [
  { code: 'DL', name: 'Delhi', regionCode: 'NORTH' },
  { code: 'UP', name: 'Uttar Pradesh', regionCode: 'NORTH' },
  { code: 'PB', name: 'Punjab', regionCode: 'NORTH' },
  { code: 'RJ', name: 'Rajasthan', regionCode: 'NORTH' },
  { code: 'MH', name: 'Maharashtra', regionCode: 'WEST' },
  { code: 'GJ', name: 'Gujarat', regionCode: 'WEST' },
  { code: 'MP', name: 'Madhya Pradesh', regionCode: 'WEST' },
  { code: 'KA', name: 'Karnataka', regionCode: 'SOUTH' },
  { code: 'TN', name: 'Tamil Nadu', regionCode: 'SOUTH' },
  { code: 'AP', name: 'Andhra Pradesh', regionCode: 'SOUTH' },
  { code: 'KL', name: 'Kerala', regionCode: 'SOUTH' },
  { code: 'WB', name: 'West Bengal', regionCode: 'EAST' },
  { code: 'OD', name: 'Odisha', regionCode: 'EAST' },
  { code: 'JH', name: 'Jharkhand', regionCode: 'EAST' },
];

export interface Territory {
  code: string;
  name: string;
  region: string;
  tier: 1 | 2;
}

export const TERRITORIES: Territory[] = [
  // North
  { code: 'DL01', name: 'Delhi - North', region: 'North', tier: 1 },
  { code: 'DL02', name: 'Delhi - South', region: 'North', tier: 1 },
  { code: 'DL03', name: 'Delhi - West', region: 'North', tier: 1 },
  { code: 'DL04', name: 'Delhi - East', region: 'North', tier: 1 },
  { code: 'DL05', name: 'Delhi - Central', region: 'North', tier: 1 },
  { code: 'UP01', name: 'Lucknow', region: 'North', tier: 2 },
  { code: 'UP02', name: 'Kanpur', region: 'North', tier: 2 },
  { code: 'UP03', name: 'Noida/Ghaziabad', region: 'North', tier: 1 },
  { code: 'PB01', name: 'Chandigarh/Mohali', region: 'North', tier: 2 },
  { code: 'PB02', name: 'Ludhiana', region: 'North', tier: 2 },
  { code: 'RJ01', name: 'Jaipur', region: 'North', tier: 2 },
  
  // West
  { code: 'MH01', name: 'Mumbai - South', region: 'West', tier: 1 },
  { code: 'MH02', name: 'Mumbai - Western Suburbs', region: 'West', tier: 1 },
  { code: 'MH03', name: 'Mumbai - Eastern Suburbs', region: 'West', tier: 1 },
  { code: 'MH04', name: 'Navi Mumbai', region: 'West', tier: 1 },
  { code: 'MH05', name: 'Pune', region: 'West', tier: 1 },
  { code: 'MH06', name: 'Nagpur', region: 'West', tier: 2 },
  { code: 'GJ01', name: 'Ahmedabad', region: 'West', tier: 1 },
  { code: 'GJ02', name: 'Surat', region: 'West', tier: 2 },
  { code: 'MP01', name: 'Indore', region: 'West', tier: 2 },
  { code: 'MP02', name: 'Bhopal', region: 'West', tier: 2 },

  // South
  { code: 'KA01', name: 'Bangalore - Central', region: 'South', tier: 1 },
  { code: 'KA02', name: 'Bangalore - North', region: 'South', tier: 1 },
  { code: 'KA03', name: 'Bangalore - South', region: 'South', tier: 1 },
  { code: 'TN01', name: 'Chennai', region: 'South', tier: 1 },
  { code: 'TN02', name: 'Coimbatore', region: 'South', tier: 2 },
  { code: 'AP01', name: 'Hyderabad', region: 'South', tier: 1 },
  { code: 'AP02', name: 'Visakhapatnam', region: 'South', tier: 2 },
  { code: 'KL01', name: 'Kochi', region: 'South', tier: 2 },

  // East
  { code: 'WB01', name: 'Kolkata', region: 'East', tier: 1 },
  { code: 'OD01', name: 'Bhubaneswar', region: 'East', tier: 2 },
  { code: 'JH01', name: 'Jamshedpur/Ranchi', region: 'East', tier: 2 },
];

export const getTerritoryName = (code: string) => {
  const territory = TERRITORIES.find(t => t.code === code);
  return territory ? territory.name : code;
};

export const getStatesByRegion = (regionCode: string) => {
  return STATES.filter(s => s.regionCode === regionCode);
};

export const getTerritoriesByState = (stateCode: string) => {
  return TERRITORIES.filter(t => t.code.startsWith(stateCode));
};

export const getStateCode = (territoryCode: string) => {
  if (!territoryCode || territoryCode.length < 2) return null;
  return territoryCode.substring(0, 2).toUpperCase();
};

export const getRegionByTerritoryCode = (code: string) => {
  const stateCode = getStateCode(code);
  const state = STATES.find(s => s.code === stateCode);
  return state ? state.regionCode : null;
};

export const getTerritoryByCode = (code: string) => {
  return TERRITORIES.find(t => t.code === code);
};

export const getTerritoryInfo = (identifier: string) => {
  if (!identifier) return null;
  // Try finding by code
  let territory = TERRITORIES.find(t => t.code.toUpperCase() === identifier.toUpperCase());
  if (territory) return territory;
  
  // Try finding by name (case insensitive)
  territory = TERRITORIES.find(t => t.name.toLowerCase() === identifier.toLowerCase());
  return territory || null;
};
