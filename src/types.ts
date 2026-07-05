export type Shape = 'corner' | 'straight' | 't-junction';

export type Rotation = 0 | 90 | 180 | 270;

export interface Treasure {
  id: string;
  name: string;
}

export interface TileData {
  id: string; // Unique ID for each tile
  shape: Shape;
  treasure?: Treasure;
  isFixed: boolean;
  color?: 'blue' | 'red' | 'green' | 'yellow'; // For starting corners
  rotation: Rotation; 
}
