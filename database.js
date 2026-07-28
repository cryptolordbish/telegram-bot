const { Pool } = require("pg");

const pool = new Pool({

  connectionString:
    process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  }

});

// =====================================
// INITIALIZE DATABASE
// =====================================

async function initializeDatabase() {

  await pool.query("SELECT NOW()");

  // =====================================
  // COMPLETED TRADES TABLE
  // =====================================

  await pool.query(`

  CREATE TABLE IF NOT EXISTS completed_trades (

    id SERIAL PRIMARY KEY,

    contract TEXT NOT NULL,

    developer_wallet TEXT,

    fee_payer TEXT,

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

  console.log(
    "✅ completed_trades table ready"
  );

  await pool.query(`

ALTER TABLE completed_trades

ADD COLUMN IF NOT EXISTS developer_wallet TEXT;

`);

console.log(
  "✅ completed_trades developer_wallet column verified"
);

// =====================================
// CREATOR CACHE TABLE
// =====================================

await pool.query(`

CREATE TABLE IF NOT EXISTS creator_cache (

    mint TEXT PRIMARY KEY,

    creator TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()

);

`);

console.log(
  "✅ creator_cache table ready"
);

// =====================================
// FUNDING WALLET CACHE TABLE
// =====================================

await pool.query(`

CREATE TABLE IF NOT EXISTS funding_wallet_cache (

    mint TEXT PRIMARY KEY,

    fee_payer TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()

);

`);

console.log(
  "✅ funding_wallet_cache table ready"
);  


  // =====================================
  // DEVELOPERS TABLE
  // =====================================

  await pool.query(`

  CREATE TABLE IF NOT EXISTS developers (

    id SERIAL PRIMARY KEY,

    developer_wallet TEXT UNIQUE,

    total_launches INTEGER DEFAULT 0,

    winners_3x INTEGER DEFAULT 0,

    winners_5x INTEGER DEFAULT 0,

    winners_10x INTEGER DEFAULT 0,

    rugs INTEGER DEFAULT 0,

    average_gain DOUBLE PRECISION DEFAULT 0,

    average_market_cap DOUBLE PRECISION DEFAULT 0,

    best_gain DOUBLE PRECISION DEFAULT 0,

    best_market_cap DOUBLE PRECISION DEFAULT 0,

    trust_score INTEGER DEFAULT 50,

    last_seen TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW()

  );

  `);

  console.log(
    "✅ developers table ready"
  );

// =====================================
// DEVELOPER LAUNCH HISTORY
// =====================================

await pool.query(`

CREATE TABLE IF NOT EXISTS developer_launches (

id SERIAL PRIMARY KEY,

developer_wallet TEXT,

fee_payer TEXT,

contract TEXT,

token_name TEXT,

highest_gain DOUBLE PRECISION,

highest_market_cap DOUBLE PRECISION,

entry_score INTEGER,

buy_signal TEXT,

sell_reason TEXT,

bought_at BIGINT,

created_at TIMESTAMP DEFAULT NOW()

);

`);

console.log(
  "✅ developer_launches table ready"
);

// =====================================
// DATABASE STATS
// =====================================

const completed = await pool.query(
  "SELECT COUNT(*) FROM completed_trades"
);

console.log(
  `📊 Completed Trades Stored: ${completed.rows[0].count}`
);

const developers = await pool.query(
  "SELECT COUNT(*) FROM developers"
);

console.log(
  `👤 Developers Stored: ${developers.rows[0].count}`
);

const launches = await pool.query(
  "SELECT COUNT(*) FROM developer_launches"
);

console.log(
  `📚 Developer Launches Stored: ${launches.rows[0].count}`
);

console.log(
  "✅ PostgreSQL Ready"
);

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
        developer_wallet,
        fee_payer,
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

      $1,$2,$3,$4,

      $5,$6,$7,

      $8,$9,$10,

      $11,$12,

      $13,$14,$15,

      $16,$17,

      $18

     )

        

      `,

      [
        
       trade.contract,
       trade.developerWallet,
       trade.feePayer,
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
// SAVE DEVELOPER LAUNCH
// =====================================

async function saveDeveloperLaunch(trade) {

  try {

    await pool.query(

      `

      INSERT INTO developer_launches (

        developer_wallet,

        fee_payer,

        contract,

        token_name,

        highest_gain,

        highest_market_cap,

        entry_score,

        buy_signal,

        sell_reason,

        bought_at

      )

      VALUES (

    $1,$2,$3,

    $4,$5,

    $6,$7,

    $8,

    $9,

    $10

)

      `,

      [

        trade.developerWallet,

        trade.feePayer,

        trade.contract,

        trade.tokenName,

        trade.highestPnL,

        trade.highestMarketCap,

        trade.entryScore,

        trade.buySignal,

        trade.sellReason,

        trade.boughtAt

      ]

    );

    console.log(

      `📚 Developer launch saved for ${trade.developerWallet}`
    );

  } catch (error) {

    console.log(

      "Developer Launch Save Error:",

      error.message

    );

  }

}

// =====================================
// UPDATE DEVELOPER STATS
// =====================================

async function updateDeveloperStats(trade) {

  try {

const wallet =
  trade.developerWallet;

if (!wallet) {

  console.log(
    "⚠️ No developer wallet found."
  );

  return;

}

const gain =
  Number(trade.highestPnL || 0);

const marketCap =
  Number(trade.highestMarketCap || 0);

    
    const existing =
      await pool.query(

        `SELECT * FROM developers
         WHERE developer_wallet = $1`,

        [wallet]

      );

    // ---------------------------------
    // FIRST TIME DEVELOPER
    // ---------------------------------

    if (
      existing.rows.length === 0
    ) {

      await pool.query(

        `

        INSERT INTO developers (

          developer_wallet,

          total_launches,

          winners_3x,

          winners_5x,

          winners_10x,

          rugs,

          average_gain,

          average_market_cap,

          best_gain,

          best_market_cap,

          trust_score

        )

        VALUES (

          $1,

          1,

          $2,

          $3,

          $4,

          $5,

          $6,

          $7,

          $8,

          $9,

          50

        )

        `,

        [

          wallet,

          gain >= 200 ? 1 : 0,

          gain >= 400 ? 1 : 0,

          gain >= 900 ? 1 : 0,

          gain < 50 ? 1 : 0,

          gain,

          marketCap,

          gain,

          marketCap

        ]

      );

      console.log(
  `👤 New Developer Stored: ${wallet}`
    );

      return;

    }

 // ---------------------------------
// EXISTING DEVELOPER
// ---------------------------------

const dev = existing.rows[0];

const totalLaunches =
  dev.total_launches + 1;

const winners3x =
  dev.winners_3x +
  (gain >= 200 ? 1 : 0);

const winners5x =
  dev.winners_5x +
  (gain >= 400 ? 1 : 0);

const winners10x =
  dev.winners_10x +
  (gain >= 900 ? 1 : 0);

const rugs =
  dev.rugs +
  (gain < 50 ? 1 : 0);

const averageGain =

  (

    dev.average_gain *

    dev.total_launches +

    gain

  ) /

  totalLaunches;

const averageMarketCap =

  (

    dev.average_market_cap *

    dev.total_launches +

    marketCap

  ) /

  totalLaunches;

const bestGain =
  Math.max(
    dev.best_gain,
    gain
  );

const bestMarketCap =
  Math.max(
    dev.best_market_cap,
    marketCap
  );

// ---------------------------------
// TRUST SCORE
// ---------------------------------

const trustScore =

  Math.max(

    0,

    Math.min(

      100,

      Math.round(

        winners3x * 5 +

        winners5x * 10 +

        winners10x * 20 -

        rugs * 5

      )

    )

  );

await pool.query(

  `

  UPDATE developers

  SET

    total_launches = $1,

    winners_3x = $2,

    winners_5x = $3,

    winners_10x = $4,

    rugs = $5,

    average_gain = $6,

    average_market_cap = $7,

    best_gain = $8,

   best_market_cap = $9,

   trust_score = $10,

   last_seen = NOW()

  WHERE developer_wallet = $11

  `,

[
  totalLaunches,
  winners3x,
  winners5x,
  winners10x,
  rugs,
  averageGain,
  averageMarketCap,
  bestGain,
  bestMarketCap,
  trustScore,
  wallet
]
  
);

console.log(
  `🔄 Updated Developer: ${wallet}`
);

console.log({
  launches: totalLaunches,
  trustScore,
  winners3x,
  winners5x,
  winners10x,
  rugs,
  averageGain,
  bestGain
});
    

  } catch (error) {

    console.log(
      "Developer Update Error:",
      error.message
    );

  }

}

// =====================================
// GET TOP DEVELOPERS
// =====================================

async function getTopDevelopers(limit = 10) {

  try {

    const result = await pool.query(

      `

      SELECT *

      FROM developers

      ORDER BY trust_score DESC,
               average_gain DESC

      LIMIT $1

      `,

      [limit]

    );

    return result.rows;

  } catch (error) {

    console.log(
      "Get Developers Error:",
      error.message
    );

    return [];

  }

}

// =====================================
// GET DEVELOPER
// =====================================

async function getDeveloper(wallet) {

  const result = await pool.query(

    `

    SELECT *

    FROM developers

    WHERE developer_wallet = $1

    `,

    [wallet]

  );

  return result.rows[0];

}

// =====================================
// GET DEVELOPER LAUNCHES
// =====================================

async function getDeveloperLaunches(wallet, limit = 5) {

  const result = await pool.query(

    `

    SELECT *

    FROM developer_launches

    WHERE developer_wallet = $1

    ORDER BY created_at DESC

    LIMIT $2

    `,

    [wallet, limit]

  );

  return result.rows;

}

// =====================================
// GET CACHED CREATOR
// =====================================

async function getCachedCreator(mint) {

  const result = await pool.query(

    `

    SELECT creator

    FROM creator_cache

    WHERE mint = $1

    LIMIT 1

    `,

    [mint]

  );

  if (result.rows.length === 0)
    return null;

  return result.rows[0].creator;

}

// =====================================
// SAVE CACHED CREATOR
// =====================================

async function saveCachedCreator(mint, creator) {

  await pool.query(

    `

    INSERT INTO creator_cache

    (mint, creator)

    VALUES ($1, $2)

    ON CONFLICT (mint)

    DO UPDATE SET

      creator = EXCLUDED.creator,

      created_at = NOW()

    `,

    [mint, creator]

  );

}

// =====================================
// GET CACHED FUNDING WALLET
// =====================================

async function getCachedFundingWallet(mint) {

  const result = await pool.query(

    `

    SELECT fee_payer

    FROM funding_wallet_cache

    WHERE mint = $1

    LIMIT 1

    `,

    [mint]

  );

  if (result.rows.length === 0)
    return null;

  return result.rows[0].fee_payer;

}

// =====================================
// SAVE CACHED FUNDING WALLET
// =====================================

async function saveCachedFundingWallet(
  mint,
  feePayer
) {

  await pool.query(

    `

    INSERT INTO funding_wallet_cache

    (mint, fee_payer)

    VALUES ($1, $2)

    ON CONFLICT (mint)

    DO UPDATE SET

      fee_payer = EXCLUDED.fee_payer,

      created_at = NOW()

    `,

    [mint, feePayer]

  );

}

// =====================================
// EXPORTS
// =====================================

module.exports = {

  pool,

  initializeDatabase,

  saveCompletedTrade,

  saveDeveloperLaunch,

  updateDeveloperStats,

  getTopDevelopers,

  getDeveloper,

  getDeveloperLaunches,

  getCachedCreator,

  saveCachedCreator,

  getCachedFundingWallet,

  saveCachedFundingWallet

};
