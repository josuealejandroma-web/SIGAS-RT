// Metres, Y-up, matching the original Blender ModelRoot. V2 instruments only.
export type Point = [number, number, number];
type NodePressure = 'P0' | 'P1' | 'PK' | 'PT' | 'PL';
export const NETWORK: { id: string; pressure: NodePressure; points: Point[] }[] = [
  { id: 'supply', pressure: 'P0', points: [[-6.2, .55, -3.05], [-4.95, .55, -3.05]] },
  { id: 'manifold', pressure: 'P1', points: [[-4.95, .55, -3.05], [-4.4, .55, -3.05], [-3.35, .55, -3.05], [3.25, .55, -3.05]] },
  { id: 'kitchen', pressure: 'PK', points: [[-3.35, .55, -3.05], [-3.35, .55, -2.55], [-3.55, .85, -2.55]] },
  { id: 'technical', pressure: 'PT', points: [[3.25, .55, -3.05], [3.45, .8, -3.05], [3.45, 1.35, -3.05]] },
  { id: 'living', pressure: 'PL', points: [[-4.4, .55, -3.05], [-4.4, .55, 1.65], [-3.25, .55, 1.65]] },
];
export const INSTRUMENTS: { id: string; key: string; label: string; kind: 'valve' | 'pressure' | 'gas'; position: Point }[] = [
  { id: 'SIGAS_VM', key: 'VM', label: 'VM', kind: 'valve', position: [-4.95,.55,-3.05] },
  { id: 'SIGAS_VK', key: 'VK', label: 'VK', kind: 'valve', position: [-3.35,.55,-2.85] },
  { id: 'SIGAS_VT', key: 'VT', label: 'VT', kind: 'valve', position: [3.45,1,-3.05] },
  { id: 'SIGAS_VL', key: 'VL', label: 'VL', kind: 'valve', position: [-4.4,.55,-2.7] },
  { id: 'SIGAS_P0', key: 'P0', label: 'P0', kind: 'pressure', position: [-5.4,.7,-3.05] },
  { id: 'SIGAS_P1', key: 'P1', label: 'P1', kind: 'pressure', position: [-4.65,.7,-3.05] },
  { id: 'SIGAS_PK', key: 'PK', label: 'PK', kind: 'pressure', position: [-3.55,1,-2.55] },
  { id: 'SIGAS_PT', key: 'PT', label: 'PT', kind: 'pressure', position: [3.45,1.5,-3.05] },
  { id: 'SIGAS_PL', key: 'PL', label: 'PL', kind: 'pressure', position: [-3.25,.75,1.65] },
  { id: 'SIGAS_MQ2_Z1', key: 'Z1', label: 'GS1 · Cocina', kind: 'gas', position: [-3.75,1.35,-1.65] },
  { id: 'SIGAS_MQ2_Z2', key: 'Z2', label: 'GS2 · Técnica', kind: 'gas', position: [3,1.35,-2.05] },
  { id: 'SIGAS_MQ2_Z3', key: 'Z3', label: 'GS3 · Living', kind: 'gas', position: [-3.25,1.35,1.65] },
];
export const CAMERA_VIEWS: Record<string, { target: Point; yaw: number; pitch: number; distance: number }> = {
  EXTERIOR: { target: [0,2.4,0], yaw: 32, pitch: 25, distance: 23 },
  COCINA: { target: [-3.35,.8,-2.35], yaw: 30, pitch: 45, distance: 7 },
  LIVING: { target: [-3.25,.8,1.65], yaw: 25, pitch: 45, distance: 7 },
  AREA_TECNICA: { target: [3.05,1,-1.95], yaw: -25, pitch: 45, distance: 7 },
  MANIFOLD_MEDIDOR: { target: [-4.8,.7,-3.05], yaw: -140, pitch: 35, distance: 6 },
  VISTA_SUPERIOR: { target: [0,0,0], yaw: 0, pitch: 85, distance: 18 },
  XRAY: { target: [0,.7,0], yaw: -25, pitch: 55, distance: 18 },
};
