import Dexie, { Table } from 'dexie';

export interface User {
  username: string;
  passwordHash: string;
  displayName?: string;
  status?: string;
}

export interface Message {
  id?: number;
  chatId: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
}

class RaynetDB extends Dexie {
  users!: Table<User, string>;
  messages!: Table<Message, number>;
  constructor() {
    super('raynet');
    this.version(1).stores({
      users: '&username,passwordHash',
      messages: '++id,chatId,from,to,timestamp',
    });
  }
}

export const db = new RaynetDB();
