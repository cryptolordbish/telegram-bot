const { Pool } = require("pg");

const pool = new Pool({

  connectionString:
    process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  }

});

async function initializeDatabase() {

  await pool.query(`

CREATE TABLE IF NOT EXISTS completed_trades (

id SERIAL PRIMARY KEY,

contract TEXT,

token_name TEXT,

entry_price DOUBLE PRECISION,

highest_price DOUBLE PRECISION,

current_price DOUBLE PRECISION,

entry_market_cap DOUBLE PRECISION,

highest_market_cap DOUBLE PRECISION,

current_market_cap DOUBLE PRECISION,

highest_pnl DOUBLE PRECISION,

current_pnl DOUBLE PRECISION,

entry_score INTEGER,

buy_signal TEXT,

bought_at BIGINT,

highest_reached_at BIGINT,

highest_market_cap_reached_at BIGINT,

sell_reason TEXT,

created_at TIMESTAMP DEFAULT NOW()

);

`);

  console.log("✅ PostgreSQL Ready");

}

module.exports = {

  pool,

  initializeDatabase

};
