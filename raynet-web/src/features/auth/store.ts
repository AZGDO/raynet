import Dexie, { Table } from 'dexie';

export interface User {
  username: string;
  displayName?: string;
  status?: string;
  code: string;
}

export interface Message {
  id?: number;
  chatId: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
}

export interface RayFileData {
  username: string;
  data: ArrayBuffer;
}

class RaynetDB extends Dexie {
  users!: Table<User, string>;
  messages!: Table<Message, number>;
  rayfiles!: Table<RayFileData, string>;
  constructor() {
    super('raynet');
    this.version(4).stores({
      users: '&username,code',
      messages: '++id,chatId,from,to,timestamp',
      rayfiles: '&username'
    });
  }
}

export const db = new RaynetDB();
