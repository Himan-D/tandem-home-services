const { Pool } = require('pg');
const config = require('./config');
const logger = require('./lib/logger');

class Database {
  constructor() {
    this.pg = null;
  }

  async connect() {
    if (!config.database.url) {
      throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure it.');
    }

    this.pg = new Pool({
      connectionString: config.database.url,
      min: config.database.poolMin,
      max: config.database.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    await this.pg.query(`SET search_path TO ${config.database.schema}`);

    const res = await this.pg.query('SELECT version()');
    const extCheck = await this.pg.query(
      "SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm')"
    );

    logger.info(
      {
        version: res.rows[0].version.split(',')[0],
        pool: `${config.database.poolMin}-${config.database.poolMax}`,
        schema: config.database.schema,
        extensions: extCheck.rows.map((r) => r.extname),
      },
      'PostgreSQL connected'
    );

    this.pg.on('error', (err) => {
      logger.error({ err: err.message }, 'PG pool error');
    });
  }

  params(sql, args) {
    let idx = 0;
    const text = sql.replace(/\?/g, () => `$${++idx}`);
    return { text, values: args || [] };
  }

  async query(sql, args = []) {
    const { text, values } = this.params(sql, args);
    const result = await this.pg.query(text, values);
    return result.rows;
  }

  async queryOne(sql, args = []) {
    const { text, values } = this.params(sql, args);
    const result = await this.pg.query(text, values);
    return result.rows[0] || null;
  }

  async execute(sql, args = []) {
    const { text, values } = this.params(sql, args);
    const finalText = text.includes('RETURNING') ? text : `${text} RETURNING id`;
    const result = await this.pg.query(finalText, values);
    return {
      rowCount: result.rowCount,
      lastID: result.rows[0]?.id || null,
      rows: result.rows,
    };
  }

  async exec(sql) {
    await this.pg.query(sql);
  }

  async transaction(fn) {
    const client = await this.pg.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        query: (sql, args) => {
          const { text, values } = this.params(sql, args);
          return client.query(text, values).then((r) => r.rows);
        },
        queryOne: (sql, args) => {
          const { text, values } = this.params(sql, args);
          return client.query(text, values).then((r) => r.rows[0] || null);
        },
        execute: async (sql, args) => {
          const { text, values } = this.params(sql, args);
          const finalText = text.includes('RETURNING') ? text : `${text} RETURNING id`;
          const result = await client.query(finalText, values);
          return {
            rowCount: result.rowCount,
            lastID: result.rows[0]?.id || null,
            rows: result.rows,
          };
        },
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  now() {
    return 'NOW()';
  }

  isPostgres() {
    return true;
  }

  async close() {
    if (this.pg) await this.pg.end();
  }
}

module.exports = new Database();
