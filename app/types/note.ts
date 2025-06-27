export interface Note {
  id: string;  // Format: 20240115103045-a1b2c3d4
  text: string;
  createdAt: Date;
  updatedAt: Date;
  sha?: string;
  isDirty?: boolean;
}
