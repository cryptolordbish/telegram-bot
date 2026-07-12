const { Pool } = require("pg");

const pool = new Pool({

  connectionString:
    process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  }

});

async function initializeDatabase() {

  await pool.query("SELECT NOW()");

  await pool.query(`

  CREATE TABLE IF NOT EXISTS completed_trades (

  id SERIAL PRIMARY KEY,

  contract TEXT NOT NULL,

  developer_wallet TEXT,

  token_name TEXT,

  entry_price DOUBLE PRECISION,

  highest_price DOUBLE PRECISION,

  current_price DOUBLE PRECISION,

  entry_market_cap DOUBLE PRECISION,

  highest_market_cap DOUBLE PRECISION,

  current_market_cap DOUBLE PRECISION,

  highest_pnl DOUBLE PRECISION,

  current_pnl DOUBLE PRECISION,

  bought_at BIGINT,

  highest_reached_at BIGINT,

  highest_market_cap_reached_at BIGINT,

  entry_score INTEGER,

  buy_signal TEXT,

  sell_reason TEXT,

  reported BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW()

  );

  `);

  console.log("✅ completed_trades table ready");

  console.log("✅ PostgreSQL Ready");

}

module.exports = {

  pool,

  initializeDatabase

};
