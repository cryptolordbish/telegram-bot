console.log(
  "🚀 SAFE AI ALPHA BOT STARTED"
);

async function reAnalyzeTokens() {

  console.log(
    `Tracked Tokens: ${trackedTokens.size}`
  );

  const now =
    Date.now();

  for (
    const [
      contract,
      token
    ] of trackedTokens
  ) {

const age =
  now -
  token.migratedAt;

let interval;

// =====================================
// 0 - 10 Minutes
// =====================================

if (
  age <
  10 * 60 * 1000
) {

  interval =
    60 * 1000; // 1 minute

}

// =====================================
// 10 - 30 Minutes
// =====================================

else if (
  age <
  30 * 60 * 1000
) {

  interval =
    3 * 60 * 1000;

}

// =====================================
// 30 - 60 Minutes
// =====================================

else if (
  age <
  60 * 60 * 1000
) {

  interval =
   5 * 60 * 1000;

}

// =====================================
// 1 - 4 Hours
// =====================================

else if (
  age <
  4 * 60 * 60 * 1000
) {

  interval =
    60 * 60 * 1000;

}

// =====================================
// Older than 4 Hours
// =====================================

else {

  console.log(
    `Finished Tracking ${contract}`
  );

  const trade =
    paperTrades.get(contract);

  if (trade) {

    const completedTrade = {

  contract,

  developerWallet:
    trade.developerWallet,

  feePayer:
    trade.feePayer,

  tokenName:
    trade.tokenName,

  entryPrice:
    trade.entryPrice,

  highestPrice:
    trade.highestPrice,

  currentPrice:
    trade.currentPrice,

  entryMarketCap:
    trade.entryMarketCap,

  highestMarketCap:
    trade.highestMarketCap,

  currentMarketCap:
    trade.currentMarketCap,

  highestPnL:
    trade.highestPnL,

  currentPnL:
    trade.currentPnL,

  boughtAt:
    trade.boughtAt,

  highestReachedAt:
    trade.highestReachedAt,

  highestMarketCapReachedAt:
    trade.highestMarketCapReachedAt,

  entryScore:
    trade.entryScore,

  buySignal:
    trade.buySignal,

  sellReason:
    trade.sellReason

};

completedTrades.push(completedTrade);

await saveCompletedTrade(completedTrade);

await saveDeveloperLaunch(completedTrade);

await updateDeveloperStats(completedTrade);
     
    console.log(
  `Completed Trades: ${completedTrades.length}`
);

if (
  completedTrades.length >= 10
) {

  await sendPaperTradeReport();

}

paperTrades.delete(contract);

    console.log(
  `Removed ${contract} from paperTrades`
);
    
  }

  trackedTokens.delete(contract);

  continue;

}

    if (

      now -
      token.lastChecked <

      interval

    ) {

      continue;

    }

    token.lastChecked =
      now;

   console.log(
  `Rechecking ${contract} | Every ${interval / 60000} minute(s)`
);

    await processToken(
  token.contract,
  token.tokenName,
  token.tokenUrl,
  token.migrationSignature
);
  }
}

require("dotenv").config();

// =====================================
// AI + LIBRARIES
// =====================================

const OpenAI = require("openai");
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const WebSocket = require("ws");

const { Connection } = require("@solana/web3.js");

const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
  "confirmed"
);

// =====================================
// DATABASE
// =====================================

const {

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

} = require("./database");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================
// TELEGRAM CONFIG
// =====================================

const bot = new TelegramBot(
  process.env.TELEGRAM_BOT_TOKEN,
  { polling: true }
);

const CHAT_ID =
  process.env.TELEGRAM_CHAT_ID;

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

const HELIUS_URL =
  "https://api.helius.xyz/v0";

// =====================================
// FEATURES
// =====================================

const ENABLE_CREATOR_LOOKUP = true;

// =====================================
// MEMORY
// =====================================

const scanned = new Set();

const trackedTokens = new Map();

const aiAnalyzedTokens = new Set();

// =====================================
// PAPER TRADING
// =====================================

const paperTrades = new Map();

// Completed trades waiting
// to be sent to Telegram

const completedTrades = [];

const PAPER_BUY_AMOUNT = 10;

// =====================================
// CONFIG
// =====================================

const CONFIG = {

  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 500000,

  MIN_LIQUIDITY: 4000,

  // SAFER ENTRY WINDOW

  MIN_TOKEN_AGE_MINUTES: 5,
  MAX_TOKEN_AGE_MINUTES: 240,
  
  // SAFETY FILTERS

  MIN_HOLDERS: 15,

  MAX_TOP_HOLDER_PERCENT: 50,
  MAX_TOP10_PERCENT: 98,

  MIN_RUG_SCORE: 7000,

  MAX_SELL_TAX: 15,

  MAX_VOL_LIQ_RATIO: 20,
};

// =====================================
// AI LIMITER
// =====================================

let activeAI = 0;

const MAX_AI_CALLS = 3;

// =====================================
// AI ANALYZER
// =====================================

async function aiAnalyzeToken(token) {

  if (
    activeAI >=
    MAX_AI_CALLS
  ) {

    return "AI Busy";
  }

  activeAI++;

  try {

    const prompt = `
Analyze this Solana meme coin.

Data:
- Market Cap: ${token.marketCap}
- Liquidity: ${token.liquidity}
- Volume: ${token.volume}
- Holders: ${token.holders}
- Top Holder: ${token.topHolder}%
- Top 10 Holders: ${token.top10}%
- Rug Score: ${token.rugScore}
- Rug Risk: ${token.rugRisk}
- Has Socials: ${token.hasSocials}
- LP Locked: ${token.lpLocked}
- Mint Enabled: ${token.mintEnabled}
- Freeze Enabled: ${token.freezeEnabled}

Evaluate:
1. Rug probability
2. Fake volume probability
3. Whale manipulation risk
4. Momentum quality
5. Final verdict

Reply concise.
`;

    const response =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [
          {
            role: "user",
            content: prompt
          }
        ],

        temperature: 0.2
      });

    activeAI--;

    return response
      .choices[0]
      .message.content;

  } catch (error) {

    activeAI--;

    console.log(
      "AI Error:",
      error.message
    );

    return "AI analysis failed";
  }
}

// =====================================
// TELEGRAM ALERT
// =====================================

async function sendAlert(message) {

  try {

    await bot.sendMessage(
      CHAT_ID,
      message
    );

    console.log(
      "Telegram Alert Sent"
    );

  } catch (error) {

    console.log(
      "Telegram Error:",
      error.message
    );
  }
}

// =====================================
// PAPER BUY
// =====================================

async function paperBuy(
  contract,
  tokenName,
  developerWallet,
  feePayer,
  price,
  marketCap,
  score,
  signal
){
  
  if (
    paperTrades.has(contract)
  ) {
    return;
  }

 paperTrades.set(
  contract,
  {
    contract,
    tokenName,
    
    developerWallet:
     developerWallet,

    feePayer:
      feePayer,

    entryPrice:
      Number(price),

    currentPrice:
      Number(price),

    highestPrice:
      Number(price),

    entryMarketCap:
      marketCap,

    currentMarketCap:
      marketCap,

    highestMarketCap:
      marketCap,

    buyAmount:
      PAPER_BUY_AMOUNT,

    // ADD THESE
    entryScore:
      score,

    buySignal:
      signal,

    currentPnL: 0,

    highestPnL: 0,

    highestReachedAt: null,

    highestMarketCapReachedAt: null,

    boughtAt:
      Date.now(),

    sold: false,

    sellReason: null
  }
);

  console.log(
    `PAPER BUY: ${tokenName}`
  );
}

// =====================================
// PAPER TRADE REPORT
// =====================================

async function sendPaperTradeReport() {

  if (completedTrades.length < 10)
    return;

  const trades =
    completedTrades.splice(0, 10);

  let message =
`📊 PAPER TRADE REPORT

`;

  let totalGain = 0;

  let wins = 0;

  let best = -999999;

  let worst = 999999;

  for (

    let i = 0;

    i < trades.length;

    i++

  ) {

    const t =
      trades[i];

    totalGain +=
      t.highestPnL;

    if (
      t.highestPnL > 0
    ) {

      wins++;

    }

    best =
      Math.max(best, t.highestPnL);

    worst =
      Math.min(worst, t.highestPnL);

    const minutesToPeak =

      t.highestReachedAt ?

      Math.round(

        (

          t.highestReachedAt -

          t.boughtAt

        ) / 60000

      )

      : "-";

    message +=

`${i + 1}️⃣ ${t.tokenName}

Score:
${t.entryScore}

Signal:
${t.buySignal}

Entry MC:
$${Math.round(t.entryMarketCap).toLocaleString()}

Highest MC:
$${Math.round(t.highestMarketCap).toLocaleString()}

Gain:
${t.highestPnL.toFixed(2)}%

Time To Peak:
${minutesToPeak} min

-----------------------

`;

  }

  const average =
    totalGain / trades.length;

  const winRate =
    wins / trades.length * 100;

  message +=

`📈 SUMMARY

Trades:
${trades.length}

Average Gain:
${average.toFixed(2)}%

Best:
${best.toFixed(2)}%

Worst:
${worst.toFixed(2)}%

Win Rate:
${winRate.toFixed(0)}%
`;

  try {

    await sendAlert(message);

    console.log(
      "📊 Paper Trade Report Sent"
    );

    await sendDeveloperReport(trades);

  } catch (error) {

    console.log(
      "Paper Trade Report Error:",
      error.message
    );

  }

}


// =====================================
// DEVELOPER REPORT
// =====================================

async function sendDeveloperReport(trades) {

  try {

    const uniqueDevelopers = [

      ...new Set(

        trades

          .map(t => t.developerWallet)

          .filter(Boolean)

      )

    ];

    if (!uniqueDevelopers.length) {

      console.log(
        "No developer wallets found."
      );

      return;

    }

    let message =

`🧠 DEVELOPER INTELLIGENCE REPORT

Developers Tracked:
${uniqueDevelopers.length}

======================

`;

    for (

      let index = 0;

      index < uniqueDevelopers.length;

      index++

    ) {

      const wallet =
        uniqueDevelopers[index];

      const dev =
  await getDeveloper(wallet);

const launches =
  await getDeveloperLaunches(wallet);

      console.log(
  "Developer:",
  wallet,
  "Launches Found:",
  launches.length,
  launches.map(l => l.token_name)
);

const latest = launches?.[0];

if (!dev || !latest)
  continue;

      const developerStatus =

  dev.total_launches <= 1

    ? "🟢 NEW DEVELOPER"

    : "🔥 RETURNING DEVELOPER";

     message += `

${index + 1}️⃣ ${developerStatus}

Wallet:
${wallet.slice(0,6)}...${wallet.slice(-6)}

Launches:
${dev.total_launches}

Current Token:
${latest.token_name || "Unknown"}

Current Gain:
${Number(latest.highest_gain || 0).toFixed(2)}%

Average Gain:
${Number(dev.average_gain || 0).toFixed(2)}%

Best Gain:
${Number(dev.best_gain || 0).toFixed(2)}%

3X Winners:
${dev.winners_3x}

5X Winners:
${dev.winners_5x}

10X Winners:
${dev.winners_10x}

⭐ Trust Score:
${dev.trust_score}/100

📚 Previous Launches

`;

    if (launches.length <= 1) {

  message +=
`No previous launches yet.

`;

} else {

  launches.slice(1).forEach((launch, i) => {
    
    message +=

`${i + 1}. ${launch.token_name || "Unknown"}

Gain:
${Number(launch.highest_gain || 0).toFixed(2)}%

Highest MC:
$${Math.round(
  launch.highest_market_cap || 0
).toLocaleString()}

`;

  });

}

message +=
`-----------------------------

`;

} // <-- End of the for loop

await sendAlert(message);

console.log(
  "🧠 Developer Report Sent"
);

  } catch (error) {

    console.log(
      "Developer Report Error:",
      error.message
    );

  }

}

// =====================================
// TOKEN AGE FILTER
// =====================================

function isValidTokenAge(
  pairCreatedAt
) {

  if (!pairCreatedAt)
    return false;

  const now = Date.now();

  const ageMinutes =

    (now - pairCreatedAt) /
    1000 / 60;

  return (

    ageMinutes >=
      CONFIG.MIN_TOKEN_AGE_MINUTES &&

    ageMinutes <=
      CONFIG.MAX_TOKEN_AGE_MINUTES
  );
}

// =====================================
// RUGCHECK API
// =====================================

async function rugCheck(contract) {

  try {

    const response =
      await axios.get(
        `https://api.rugcheck.xyz/v1/tokens/${contract}/report`
      );

    return response.data;

  } catch (error) {

    console.log(
      "RugCheck Error:",
      error.message
    );

    return null;
  }
}

// =====================================
// SCORE ENGINE
// =====================================

function calculateScore(data) {

  let score = 50;

  // =====================================
  // LIQUIDITY
  // =====================================

  if (
    data.liquidity > 20000
  ) {

    score += 20;

  } else if (
    data.liquidity < 5000
  ) {

    score -= 20;
  }

  // =====================================
  // MARKET CAP
  // =====================================

  if (

    data.marketCap > 50000 &&
    data.marketCap < 200000

  ) {

    score += 15;
  }

  if (
    data.marketCap < 10000
  ) {

    score -= 25;
  }

  // =====================================
  // VOLUME
  // =====================================

  if (
    data.volume > 30000
  ) {

    score += 15;
  }

  // =====================================
  // HOLDERS
  // =====================================

 if (
  data.holders > 300
) {

  score += 10;

} else if (
  data.holders > 100
) {

  score += 5;
}
  // =====================================
  // TOP HOLDER
  // =====================================

  if (
    data.topHolder > 50
  ) {

    score -= 35;
  }
    
  else if (data.topHolder > 30) {

  score -= 15;
}
  
  // =====================================
  // TOP 10 HOLDERS
  // =====================================

  if (
    data.top10 > 90
  ) {

    score -= 35;
  }

  else if (data.top10 > 40) {

  score -= 15;
}

  // =====================================
  // MINT ENABLED
  // =====================================

  if (
    data.mintEnabled
  ) {

    score -= 50;
  }

  // =====================================
  // FREEZE ENABLED
  // =====================================

  if (
    data.freezeEnabled
  ) {

    score -= 40;
  }

   // =====================================
  // LP UNLOCKED
  // =====================================

  if (
    !data.lpLocked
  ) {

    score -= 60;

  }

  // =====================================
  // RUG SCORE (Monitor Only)
  // =====================================

  if (
    data.rugScore &&
    data.rugScore < CONFIG.MIN_RUG_SCORE
  ) {

    console.log(
      `Low Rug Score = ${data.rugScore} (AI will evaluate)`
    );

  }

  return Math.max(
    0,
    Math.min(100, score)
  );

}

// =====================================
// GET FUNDING WALLET
// =====================================

async function getFundingWallet(
  mint,
  signature
) {

}

// =====================================
// FIND ORIGINAL CREATOR
// =====================================

async function findOriginalCreator(mint) {

  if (!mint) return null;

// =====================================
// CHECK DATABASE CACHE FIRST
// =====================================

const cachedCreator =
  await getCachedCreator(mint);

if (cachedCreator) {

  console.log(
    `Creator Cache Hit: ${cachedCreator}`
  );

  return cachedCreator;

}

try {

  console.log(
    `Searching creator for ${mint}`
  );

  let pages = 0;

  const MAX_PAGES = 20;

  let before = null;

  let oldestTx = null;

  // =====================================
  // TRANSACTION TYPES THAT INDICATE
  // TOKEN CREATION
  // =====================================

  const CREATION_TYPES = [

    "CREATE",

    "CREATE_POOL",

    "INITIALIZE_MINT",

    "INITIALIZE_ACCOUNT",

    "MINT"

  ];

  while (pages < MAX_PAGES) {

    const response =
      await axios.get(

        `${HELIUS_URL}/addresses/${mint}/transactions`,

        {
          params: {
            "api-key": HELIUS_API_KEY,
            limit: 100,
            before
          }
        }

      );

    const transactions =
      response.data || [];

    pages++;

    console.log(
      `Scanning Page ${pages}`
    );

    if (!transactions.length)
      break;

    // =====================================
    // SAVE THE OLDEST TX OF THIS PAGE
    // =====================================

    oldestTx =
      transactions[
        transactions.length - 1
      ];

    console.log(
      `Fetched ${transactions.length} transactions`
    );

    // =====================================
    // DEBUG
    // =====================================

    console.log(
      `Oldest Type: ${oldestTx.type}`
    );

    console.log(
      `Oldest Source: ${oldestTx.source}`
    );

    console.log(
      `Oldest Fee Payer: ${oldestTx.feePayer}`
    );

    // =====================================
    // STOP WHEN CREATION TX IS FOUND
    // =====================================

    if (

      CREATION_TYPES.includes(
        oldestTx.type
      )

    ) {

      console.log(
        `Creation transaction found (${oldestTx.type})`
      );

      break;

    }

    // =====================================
    // NEXT PAGE
    // =====================================

    before =
      oldestTx.signature;

  }

  const creator =
    oldestTx?.feePayer || null;

  if (creator) {

    console.log(
      `Original Creator Found: ${creator}`
    );

    await saveCachedCreator(
      mint,
      creator
    );

  }

  return creator;

} catch (error) {

  console.log(
    "Find Creator Error:",
    error.response?.data ||
    error.message
  );

  return null;

}

}  
  
// =====================================
// SIGNAL ENGINE
// =====================================

function getSignal(score) {

  if (score >= 75) {

    return {
      signal: "🟢 BUY",
      allowed: true
    };
  }

  if (score >= 72) {

    return {
      signal: "🟡 WATCHLIST",
      allowed: true
    };
  }

  return {
    signal: "❌ REJECTED",
    allowed: false
  };
}

// =====================================
// SAFETY ANALYZER
// =====================================

async function analyzeSafety(
  contract,
  pair,
  token
) {

  console.log(
    `${contract}: Running Safety`
  );

 const rug =
  await rugCheck(contract);

if (!rug) {

  console.log(
    `${contract}: No RugCheck Data`
  );

  return {
    safe: false,
    reason: "No RugCheck"
  };

}

  // =====================================
  // LP LOCK
  // =====================================

  const lpUnlocked =
    rug.risks?.some(r =>

      r.name?.toLowerCase()
        .includes("lp unlocked")
    );

  if (lpUnlocked) {

    return {
      safe: false,
      reason: "LP Unlocked"
    };
  }

  // =====================================
  // MINT AUTHORITY
  // =====================================

  const mintEnabled =

    rug.token?.mintAuthority
      !== null;

  if (mintEnabled) {

    return {
      safe: false,
      reason: "Mint Enabled"
    };
  }

  // =====================================
  // FREEZE AUTHORITY
  // =====================================

  const freezeEnabled =

    rug.token?.freezeAuthority
      !== null;

  if (freezeEnabled) {

    return {
      safe: false,
      reason: "Freeze Enabled"
    };
  }

  // =====================================
  // RUG SCORE
  // =====================================

  const rugScore =
  rug.score || 0;

  console.log(
  `Rug Score for ${contract}:`,
  rugScore
);
  
const rugRisk =
  rugScore <
  CONFIG.MIN_RUG_SCORE;

if (rugRisk) {

  console.log(
    `${contract}: Low Rug Score (${rugScore}) - AI will evaluate`
  );

}

  // =====================================
  // HOLDER ANALYSIS
  // =====================================

  console.log(
  `${contract}: totalHolders =`,
  rug.totalHolders
);

console.log(
  `${contract}: topHolders count =`,
  rug.topHolders?.length
);
  
  const holders =
  rug.totalHolders ??
  rug.tokenMeta?.holders ??
  0;
  
console.log(
  `Holders for ${contract}: ${holders}`
);

if (
  holders <
  CONFIG.MIN_HOLDERS
) {

  return {
    safe: false,
    reason: "Low Holders"
  };
}

const topHolders =
  rug.topHolders || [];
  
const topHolder =
  topHolders[0]?.pct || 0;

console.log(
  `Top Holder for ${contract}: ${topHolder}%`
);

if (
  topHolder >
  CONFIG.MAX_TOP_HOLDER_PERCENT
) {

  return {
    safe: false,
    reason: "Whale Controlled"
  };
}

const top10 =
  topHolders
    .slice(0, 10)
    .reduce(
      (sum, h) =>
        sum + (h.pct || 0),
      0
    );

console.log(
  `Top10 for ${contract}: ${top10}%`
);

if (
  top10 >
  CONFIG.MAX_TOP10_PERCENT
) {

  return {
    safe: false,
    reason:
      "Supply Concentrated"
  };
}
  
// Continue with the rest of your checks below...
  
// =====================================
// FAKE VOLUME (Monitor Only)
// =====================================

const liquidity =
  pair.liquidity?.usd || 1;

const volume =
  pair.volume?.h24 || 0;

const volRatio =
  volume / liquidity;

if (
  volRatio >
  CONFIG.MAX_VOL_LIQ_RATIO
) {

  console.log(
    `${contract}: High Volume Ratio = ${volRatio.toFixed(2)} (AI will evaluate)`
  );

}
  
  // =====================================
  // BUY / SELL RATIO
  // =====================================

  const buys =
    pair.txns?.h1?.buys || 0;

  const sells =
    pair.txns?.h1?.sells || 0;

  if (
    buys > 0 &&
    sells === 0
  ) {

    return {
      safe: false,
      reason:
        "Possible Honeypot"
    };
  }

  // =====================================
  // SOCIALS CHECK
  // =====================================

  const hasSocials =

    token?.links?.length > 0 ||

    pair.info?.websites?.length > 0 ||

    pair.info?.socials?.length > 0;

  if (!hasSocials) {

  console.log(
    `${contract}: No Socials - AI will evaluate`
  );

}

return {

  safe: true,

  developerWallet:
    rug.creator,

  rugScore,

  rugRisk,

  holders,

  topHolder,

  top10,

  mintEnabled,

  freezeEnabled,

  lpLocked: !lpUnlocked,

  hasSocials

};

}
  
// =====================================
// PROCESS TOKEN
// =====================================

async function processToken(
  contract,
  tokenName,
  tokenUrl,
  migrationSignature = null
) {

  // DECLARE VARIABLES OUTSIDE TRY BLOCK
  let pair = null;
  let marketCap = 0;
  let liquidity = 0;
  let volume = 0;
  let volRatio = 0;
  let safety = null;
  let score = 0;
  let result = null;
  let aiResult = "Skipped";

  try {

    console.log(
      `Processing ${tokenName} ${contract}`
    );

    // =====================================
    // TOKEN MEMORY
    // =====================================

    let tokenData =
      trackedTokens.get(contract) || {};

    // =====================================
    // FUNDING WALLET
    // =====================================

    let fundingWallet =
      tokenData.feePayer || null;

    if (!fundingWallet && migrationSignature) {

      fundingWallet =
        await getFundingWallet(
          contract,
          migrationSignature
        );

      tokenData = {
        ...tokenData,
        feePayer: fundingWallet
      };

      trackedTokens.set(
        contract,
        tokenData
      );

    }

    // =====================================
    // WAIT FOR DEXSCREENER PAIR
    // =====================================

    for (
      let attempt = 1;
      attempt <= 6;
      attempt++
    ) {

      try {

        const pairResponse =
          await axios.get(
            `https://api.dexscreener.com/latest/dex/search?q=${contract}`
          );

        const pairs =
          pairResponse.data?.pairs || [];

        pair =
          pairs.find(
            (p) =>

              p.chainId ===
                "solana" &&

              p.liquidity?.usd > 0
          );

        if (pair) {

          console.log(
            `${contract}: Pair Found`
          );

          break;

        }

        console.log(
          `${contract}: Pair not ready (${attempt}/6)`
        );

      } catch (error) {

        console.log(
          `${contract}: DexScreener request failed (${attempt}/6)`
        );

      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            5000
          )
      );

    }

    if (!pair) {

      console.log(
        `${contract}: Pair not found after 30 seconds`
      );

      return;

    }

    // =====================================
    // FIND ORIGINAL TOKEN CREATOR
    // =====================================

    let originalCreator =
      tokenData.originalCreator || null;

    if (
      ENABLE_CREATOR_LOOKUP &&
      !originalCreator
    ) {

      try {

        originalCreator =
          await findOriginalCreator(
            contract
          );

        if (originalCreator) {

          console.log(
            `Original Creator: ${originalCreator}`
          );

          tokenData = {
            ...tokenData,
            originalCreator
          };

          trackedTokens.set(
            contract,
            tokenData
          );

        }

      } catch (error) {

        console.log(
          `Creator Lookup Failed: ${error.message}`
        );

      }

    }

// =====================================
// DEVELOPER PERFORMANCE
// =====================================

let developerStats = null;

let developerReport = "";

if (originalCreator) {

  try {

    developerStats =
      await getDeveloper(
        originalCreator
      );

    if (developerStats) {

      const failed = Math.max(
        0,
        developerStats.total_launches -
        developerStats.winners_3x
      );

      const winRate =
        developerStats.total_launches
          ? (
              developerStats.winners_3x /
              developerStats.total_launches *
              100
            ).toFixed(1)
          : 0;

      developerReport = `

━━━━━━━━━━━━━━

👤 Developer

Wallet:
${originalCreator.slice(0,5)}...${originalCreator.slice(-4)}

📦 Launches:
${developerStats.total_launches}

🏆 3X Winners:
${developerStats.winners_3x}

🔥 5X Winners:
${developerStats.winners_5x}

💎 10X Winners:
${developerStats.winners_10x}

💀 Failed:
${failed}

🎯 Win Rate:
${winRate}%

🚀 Best:
+${Number(
  developerStats.best_gain || 0
).toFixed(0)}%

📈 Average:
+${Number(
  developerStats.average_gain || 0
).toFixed(0)}%

⭐ Trust Score:
${developerStats.trust_score}/100
`;

    }

  } catch (error) {

    console.log(
      `Developer Stats Failed: ${error.message}`
    );

  }

}

    // =====================================
    // TOKEN AGE
    // =====================================

    const ageMinutes =
      (Date.now() - pair.pairCreatedAt) /
      1000 /
      60;

    if (
      ageMinutes <
      CONFIG.MIN_TOKEN_AGE_MINUTES
    ) {
      return;
    }

    if (
      ageMinutes >
      CONFIG.MAX_TOKEN_AGE_MINUTES
    ) {

      trackedTokens.delete(
        contract
      );

      return;

    }

    // =====================================
    // UPDATE MEMORY
    // =====================================

    tokenData = {
      ...tokenData,
      contract,
      tokenName,
      tokenUrl,
      pairCreatedAt:
        pair.pairCreatedAt,
      migratedAt:
        tokenData.migratedAt,
      feePayer:
        fundingWallet,
      originalCreator,
      lastChecked:
        tokenData.lastChecked ??
        Date.now(),
      lastSignal:
        tokenData.lastSignal
    };

    trackedTokens.set(
      contract,
      tokenData
    );

// =====================================
// MARKET DATA
// =====================================

marketCap =
  pair.marketCap || 0;

liquidity =
  pair.liquidity?.usd || 0;

volume =
  pair.volume?.h24 || 0;

console.log(
  `${tokenName} | MC=${marketCap} | LIQ=${liquidity}`
);

// =====================================
// UPDATE PAPER TRADE
// =====================================

const trade =
  paperTrades.get(contract);

if (
  trade &&
  !trade.sold
) {

  const currentPrice =
  Number(pair.priceUsd || 0);

trade.currentPrice =
  currentPrice;

  trade.currentMarketCap =
    marketCap;

  if (trade.entryPrice > 0) {

  trade.currentPnL =
    (
      (
        trade.currentPrice -
        trade.entryPrice
      ) /
      trade.entryPrice
    ) * 100;

}

 if (
  trade.currentPrice >
  trade.highestPrice
) {

  trade.highestPrice =
    trade.currentPrice;

  trade.highestReachedAt =
    Date.now();

}

  if (
  marketCap >
  trade.highestMarketCap
) {

  trade.highestMarketCap =
    marketCap;

  trade.highestMarketCapReachedAt =
    Date.now();

}

  if (
    trade.currentPnL >
    trade.highestPnL
  ) {

    trade.highestPnL =
      trade.currentPnL;

  }

  console.log(
    `📈 ${trade.tokenName} | Current: ${trade.currentPnL.toFixed(2)}% | Highest: ${trade.highestPnL.toFixed(2)}%`
  );

}

    // =====================================
    // BASIC FILTERS
    // =====================================

    if (

      marketCap <
        CONFIG.MIN_MARKET_CAP ||

      marketCap >
        CONFIG.MAX_MARKET_CAP ||

      liquidity <
        CONFIG.MIN_LIQUIDITY

    ) {

      return;
    }

 // =====================================
// SAFETY CHECKS
// =====================================

safety =
  await analyzeSafety(
    contract,
    pair,
    pair
  );

if (!safety.safe) {

  console.log(
    `Rejected ${contract}: ${safety.reason}`
  );

  // Update lastSignal to track rejection
  // but keep token for re-analysis
  const tracked =
    trackedTokens.get(contract);

  if (tracked) {
    tracked.lastSignal =
      `❌ ${safety.reason}`;
  }

  return;
}
  
     // =====================================
    // SCORE
    // =====================================

    score =
      calculateScore({

        marketCap,
        liquidity,
        volume,

        rugScore:          
          safety.rugScore,  

        holders:
          safety.holders,

        topHolder:
          safety.topHolder,

        top10:
          safety.top10,

        mintEnabled:
          safety.mintEnabled,

        freezeEnabled:
          safety.freezeEnabled,

        lpLocked:
          safety.lpLocked
      });

    result =
      getSignal(score);

    console.log(
      `${contract}: Score=${score}, Signal=${result.signal}, Allowed=${result.allowed}`
    );

    const tracked =
      trackedTokens.get(contract);

    if (tracked) {

      tracked.lastSignal =
        result.signal;
    }

    if (!result.allowed)
      return;

    // =====================================
    // AI
    // =====================================

if (
  score >= 50
) {

  console.log(
    `${contract}: Running AI Analysis`
  );

  aiResult =
    await aiAnalyzeToken({

      marketCap,
      liquidity,
      volume,

      volRatio,

      rugScore:
        safety.rugScore,

      rugRisk:
        safety.rugRisk,

      hasSocials:
        safety.hasSocials,

      holders:
        safety.holders,

      topHolder:
        safety.topHolder,

      top10:
        safety.top10,

      mintEnabled:
        safety.mintEnabled,

      freezeEnabled:
        safety.freezeEnabled,

      lpLocked:
        safety.lpLocked

    });

}
    
// =====================================
// PAPER BUY
// =====================================

if (score >= 75) {

  await paperBuy(
  contract,
  tokenName,
  safety.developerWallet,
  fundingWallet,
  pair.priceUsd,
  marketCap,
  score,
  result.signal
);

}

  } catch (error) {
    console.log(
      "Process Token Error:",
      error.message
    );
    console.log(
      "Failed URL:",
      error.config?.url
    );
    console.log(
      "Status:",
      error.response?.status
    );
    return;
  }

 // =====================================
// ALERT (OUTSIDE TRY-CATCH)
// =====================================

if (result && result.allowed) {

  await sendAlert(`

🚨 ${result.signal}

🪙 ${tokenName}

📄 Contract:
${contract}

💰 Market Cap:
$${marketCap.toLocaleString()}

💧 Liquidity:
$${liquidity.toLocaleString()}

📊 Volume:
$${volume.toLocaleString()}

👥 Holders:
${safety.holders}

🐋 Top Holder:
${safety.topHolder.toFixed(2)}%

🏦 Top 10:
${safety.top10.toFixed(2)}%

🛡 Rug Score:
${safety.rugScore}

📈 Score:
${score}/100

🧠 AI:
${aiResult}

${developerReport || ""}

🔒 LP Locked:
${safety.lpLocked ? "YES" : "NO"}

🪙 Mint:
${safety.mintEnabled ? "ON" : "OFF"}

❄️ Freeze:
${safety.freezeEnabled ? "ON" : "OFF"}

🔗 ${tokenUrl || "No URL"}

  `);

}

}  
  
// =====================================
// PUMPFUN TRACKER
// =====================================

function startPumpFun() {

  const ws = new WebSocket(
    "wss://pumpportal.fun/api/data"
  );

  ws.on("open", () => {

    console.log(
      "Pump.fun Connected"
    );

    ws.send(
      JSON.stringify({
        method: "subscribeMigration"
      })
    );

  });

  ws.on(
    "message",
    async (data) => {

      try {

        const token =
          JSON.parse(data);

        console.log(
          "Migration Event:",
          token
        );

        if (!token.mint)
          return;

        const contract =
          token.mint;

        if (
          scanned.has(contract)
        ) {
          return;
        }

        scanned.add(contract);

        console.log(
          `Graduated Token: ${contract}`
        );

       trackedTokens.set(
  contract,
  {
    contract,

    tokenName:
      token.name || contract,

    tokenUrl:
      `https://pump.fun/${contract}`,

    migrationSignature:
      token.signature,

    pairCreatedAt:
      Date.now(),

    migratedAt:
      Date.now(),

    lastChecked:
      0,

    lastSignal:
      null
  }
);

 // =====================================
// WAIT 2 MINUTES THEN PROCESS
// =====================================

setTimeout(async () => {

  await processToken(

  contract,

  token.name ||
    contract,

  `https://pump.fun/${contract}`,

  token.signature

);

}, 1000 * 60 * 2);

      } catch (error) {

        console.log(
          "Pumpfun Error:",
          error.message
        );

      }

    }

  );

  ws.on("close", () => {

    console.log(
      "Pump.fun Reconnecting..."
    );

    setTimeout(
      startPumpFun,
      5000
    );

  });

  ws.on("error", (error) => {

    console.log(
      "Pumpfun WS Error:",
      error.message
    );

  });

}

// =====================================
// CLEANUP MEMORY
// =====================================

function cleanupScanned() {

  for (
    const contract
    of scanned
  ) {

    // If we're no longer tracking
    // the token, remove it from
    // the scanned list too.

    if (
      !trackedTokens.has(contract)
    ) {

      scanned.delete(
        contract
      );

      console.log(
        `Cleaned ${contract} from scanned memory`
      );

    }

  }

}

// =====================================
// START BOT
// =====================================

async function startBot() {

  console.log(
    "🚀 SAFE AI ALPHA BOT STARTED"
  );

  await initializeDatabase();

  startPumpFun();

  setInterval(
    reAnalyzeTokens,
    1000 * 15
  );

  setInterval(
    cleanupScanned,
    1000 * 60 * 5
  );

}

startBot().catch(error => {

  console.error(error);

});
