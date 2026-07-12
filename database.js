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

// =====================================
// SAVE COMPLETED TRADE
// =====================================

async function saveCompletedTrade(trade) {

  try {

    await pool.query(

      `

      INSERT INTO completed_trades (

        contract,
        token_name,

        entry_price,
        highest_price,
        current_price,

        entry_market_cap,
        highest_market_cap,
        current_market_cap,

        highest_pnl,
        current_pnl,

        bought_at,
        highest_reached_at,
        highest_market_cap_reached_at,

        entry_score,
        buy_signal,

        sell_reason

      )

      VALUES (

        $1,$2,

        $3,$4,$5,

        $6,$7,$8,

        $9,$10,

        $11,$12,$13,

        $14,$15,

        $16

      )

      `,

      [

        trade.contract,
        trade.tokenName,

        trade.entryPrice,
        trade.highestPrice,
        trade.currentPrice,

        trade.entryMarketCap,
        trade.highestMarketCap,
        trade.currentMarketCap,

        trade.highestPnL,
        trade.currentPnL,

        trade.boughtAt,
        trade.highestReachedAt,
        trade.highestMarketCapReachedAt,

        trade.entryScore,
        trade.buySignal,

        trade.sellReason

      ]

    );

    console.log(
      `💾 Saved ${trade.tokenName} to PostgreSQL`
    );

  } catch (error) {

    console.log(
      "Database Save Error:",
      error.message
    );

  }

}

// =====================================
// EXPORTS
// =====================================

module.exports = {

  pool,

  initializeDatabase,

  saveCompletedTrade

};
