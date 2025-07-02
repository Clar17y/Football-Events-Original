import Dexie, { Table } from 'dexie';

export interface OutboxEvent {
  id?: number;
  payload: any;
  synced: boolean;
  createdAt: number;
}

class GrassrootsDB extends Dexie {
  public outbox!: Table<OutboxEvent, number>;

  constructor() {
    super('grassroots_db');
    this.version(1).stores({
      outbox: '++id, synced, createdAt'
    });
  }
}

export const db = new GrassrootsDB();
