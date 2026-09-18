import sqlite3 from 'sqlite3';
import { Pool, QueryResultRow } from 'pg';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || './db/kappa.sqlite';
const SCHEMA_PATH = path.join(__dirname, '../../db/schema.sql');
const POSTGRES_SCHEMA_PATH = path.join(__dirname, '../../db/schema.postgres.sql');

// Wrapper para usar promessas com sqlite3
export class Database {
  private db: sqlite3.Database | null = null;
  private pool: Pool | null = null;

  private get isPostgres(): boolean {
    return Boolean(process.env.DATABASE_URL);
  }

  // Inicializar conexão
  async initialize(): Promise<void> {
    if (this.isPostgres) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      });
      await this.createTables();
      console.log('✅ Conexão ao PostgreSQL estabelecida');
      return;
    }

    return new Promise((resolve, reject) => {
      const dbDir = path.dirname(DB_PATH);

      // Criar diretório se não existir
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar ao banco de dados:', err);
          reject(err);
        } else {
          console.log('✅ Conexão ao SQLite estabelecida');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });

      // Habilitar foreign keys
      if (this.db) {
        this.db.run('PRAGMA foreign_keys = ON');
      }
    });
  }

  // Criar tabelas a partir do schema
  private async createTables(): Promise<void> {
    if (this.isPostgres) {
      if (!this.pool) {
        throw new Error('PostgreSQL não inicializado');
      }
      const schema = fs.readFileSync(POSTGRES_SCHEMA_PATH, 'utf-8');
      await this.pool.query(schema);
      console.log('✅ Tabelas criadas/verificadas com sucesso');
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }

      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      const statements = schema
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      let index = 0;

      const executeNextStatement = () => {
        if (index >= statements.length) {
          console.log('✅ Tabelas criadas/verificadas com sucesso');
          resolve();
          return;
        }

        const statement = statements[index++];

        if (!this.db) {
          reject(new Error('Database não inicializado'));
          return;
        }

        this.db.run(statement, (err) => {
          if (err) {
            console.error('Erro ao executar statement SQL:', statement);
            console.error(err);
            reject(err);
          } else {
            executeNextStatement();
          }
        });
      };

      executeNextStatement();
    });
  }

  // Executar query com promessa
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    if (this.isPostgres) {
      if (!this.pool) {
        throw new Error('PostgreSQL não inicializado');
      }
      const statement = /^\s*INSERT\s/i.test(sql) && !/\bRETURNING\b/i.test(sql)
        ? `${sql.replace(/;\s*$/, '')} RETURNING id`
        : sql;
      const result = await this.pool.query(statement ? this.replaceParameters(statement) : statement, params);
      const row = result.rows[0] as { id?: number } | undefined;
      return { lastID: row?.id || 0, changes: result.rowCount || 0 };
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // Buscar um registro
  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (this.isPostgres) {
      if (!this.pool) {
        throw new Error('PostgreSQL não inicializado');
      }
      const result = await this.pool.query<T & QueryResultRow>(this.replaceParameters(sql), params);
      return result.rows[0];
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }

  // Buscar múltiplos registros
  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.isPostgres) {
      if (!this.pool) {
        throw new Error('PostgreSQL não inicializado');
      }
      const result = await this.pool.query<T & QueryResultRow>(this.replaceParameters(sql), params);
      return result.rows;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  }

  // Fechar conexão
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ Conexão ao PostgreSQL fechada');
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) reject(err);
        else {
          console.log('✅ Conexão ao SQLite fechada');
          resolve();
        }
      });
    });
  }

  private replaceParameters(sql: string): string {
    let parameterIndex = 0;
    return sql.replace(/\?/g, () => `$${++parameterIndex}`);
  }
}

// Instância global do banco
export const database = new Database();
