require("dotenv").config();

// =====================================
// AI CODE
// =====================================

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const WebSocket = require("ws");

// =====================================
// TELEGRAM CONFIG
// =====================================

const bot = new TelegramBot(
  process.env.TELEGRAM_BOT_TOKEN
);

const CHAT_ID =
  process.env.TELEGRAM_CHAT_ID;

// =====================================
// MEMORY
// =====================================

const scanned = new Set();

// CLEAR MEMORY EVERY 30 MINUTES

setInterval(() => {

  scanned.clear();

  console.log(
    "Scanned memory cleared"
  );

}, 1000 * 60 * 30);

// =====================================
// CONFIG
// =====================================

const CONFIG = {

  MIN_MARKET_CAP: 15000,
  MAX_MARKET_CAP: 250000,
  MIN_LIQUIDITY: 5000,

  // TOKEN AGE

  MIN_TOKEN_AGE_MINUTES: 5,
  MAX_TOKEN_AGE_MINUTES: 120,
};

// =====================================
// AI LIMITER
// =====================================

let activeAI = 0;

const MAX_AI_CALLS = 3;

// =====================================
// AI ANALYZER FUNCTION
// =====================================

async function aiAnalyzeToken(token) {

  // LIMIT AI REQUESTS

  if (
    activeAI >=
    MAX_AI_CALLS
  ) {

    return "AI Busy";
  }

  activeAI++;

  try {

    // FAST PROMPT

    const prompt = `
Analyze this Solana token.

Name: ${token.name}
MC: ${token.marketCap}
Liquidity: ${token.liquidity}
Volume: ${token.volume}

Reply shortly:
- Scam Risk
- Buy Confidence
- Verdict
`;

    const response =
      await openai.chat.completions.create({

        // FASTER MODEL

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

    console.log(
      "AI Error:",
      error.message
    );

    activeAI--;

    return "AI analysis failed";
  }
}

// =====================================
// SEND TELEGRAM ALERT
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
// SCORE ENGINE
// =====================================

function calculateScore(data) {

  let score = 50;

  // liquidity

  if (
    data.liquidity > 20000
  ) {

    score += 20;

  } else if (
    data.liquidity < 5000
  ) {

    score -= 20;
  }

  // market cap

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

  // volume

  if (
    data.volume > 30000
  ) {

    score += 15;
  }

  return Math.max(
    0,
    Math.min(100, score)
  );
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

  if (score >= 50) {

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
// TOKEN AGE FILTER
// =====================================

function isValidTokenAge(
  pairCreatedAt
) {

  if (!pairCreatedAt) {

    return false;
  }

  const now = Date.now();

  const ageMinutes =

    (now - pairCreatedAt) /
    1000 / 60;

  return (

    ageMinutes >=
      CONFIG
        .MIN_TOKEN_AGE_MINUTES &&

    ageMinutes <=
      CONFIG
        .MAX_TOKEN_AGE_MINUTES
  );
}

// =====================================
// DEXSCREENER TRACKER
// =====================================

async function scanDexScreener() {

  try {

    console.log(
      "Scanning DexScreener..."
    );

    const response =
      await axios.get(
        "https://api.dexscreener.com/token-profiles/latest/v1"
      );

    const tokens =
      response.data || [];

    for (const token of tokens) {

      if (
        token.chainId !==
        "solana"
      ) continue;

      const contract =
        token.tokenAddress;

      if (
        scanned.has(contract)
      ) continue;

      scanned.add(contract);

      // =====================================
      // LIVE DATA
      // =====================================

      let marketCap = 0;
      let liquidity = 0;
      let volume = 0;

      try {

        const pairResponse =
          await axios.get(
            `https://api.dexscreener.com/latest/dex/search?q=${contract}`
          );

        const pairs =
          pairResponse.data
            .pairs || [];

        const pair =
          pairs.find(
            (p) =>

              p.chainId ===
                "solana" &&

              p.liquidity?.usd >
                0
          );

        if (!pair) continue;

        // TOKEN AGE

        if (
          !isValidTokenAge(
            pair.pairCreatedAt
          )
        ) {

          console.log(
            `Skipped Old/New Token: ${contract}`
          );

          continue;
        }

        marketCap =
          pair.marketCap || 0;

        liquidity =
          pair.liquidity?.usd || 0;

        volume =
          pair.volume?.h24 || 0;

      } catch (error) {

        console.log(
          "Pair Lookup Error:",
          error.message
        );

        continue;
      }

      // =====================================
      // FILTERS
      // =====================================

      if (

        marketCap <
          CONFIG
            .MIN_MARKET_CAP ||

        marketCap >
          CONFIG
            .MAX_MARKET_CAP ||

        liquidity <
          CONFIG
            .MIN_LIQUIDITY

      ) continue;

      // =====================================
      // SCORE
      // =====================================

      const score =
        calculateScore({

          marketCap,
          liquidity,
          volume
        });

      const result =
        getSignal(score);

      // =====================================
      // REJECT WEAK TOKENS
      // =====================================

      if (!result.allowed) {

        console.log(
          `Rejected Coin: ${contract}`
        );

        continue;
      }

      // =====================================
      // AI ONLY FOR HIGH SCORES
      // =====================================

      let aiResult =
        "Skipped";

      if (score >= 75) {

        aiResult =
          await aiAnalyzeToken({

            name: contract,
            marketCap,
            liquidity,
            volume
          });
      }

      // =====================================
      // SEND ALERT
      // =====================================

      await sendAlert(`

🚨 DEXSCREENER SIGNAL ${result.signal}

📄 Contract:
${contract}

💰 Market Cap:
$${marketCap.toLocaleString()}

💧 Liquidity:
$${liquidity.toLocaleString()}

📊 Volume:
$${volume.toLocaleString()}

📈 Score:
${score}/100

🧠 AI:
${aiResult}

⚡ Real-Time Alert

🔗 ${token.url || "No URL"}

`);
    }

  } catch (error) {

    console.log(
      "Dex Error:",
      error.response?.data ||
      error.message
    );
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
        method:
          "subscribeNewToken"
      })
    );
  });

  ws.on(
    "message",
    async (data) => {

      try {

        const token =
          JSON.parse(data);

        if (!token.mint)
          return;

        if (
          scanned.has(
            token.mint
          )
        ) return;

        scanned.add(
          token.mint
        );

        // =====================================
        // LIVE DATA
        // =====================================

        let marketCap =
          token.marketCapSol || 0;

        let liquidity = 0;
        let volume = 0;

        try {

          const pairResponse =
            await axios.get(
              `https://api.dexscreener.com/latest/dex/search?q=${token.mint}`
            );

          const pairs =
            pairResponse.data
              .pairs || [];

          const pair =
            pairs.find(
              (p) =>

                p.chainId ===
                  "solana" &&

                p.liquidity?.usd >
                  0
            );

          if (pair) {

            // TOKEN AGE

            if (
              !isValidTokenAge(
                pair.pairCreatedAt
              )
            ) {

              console.log(
                `Skipped Old/New Token: ${token.name}`
              );

              return;
            }

            marketCap =
              pair.marketCap ||
              marketCap;

            liquidity =
              pair.liquidity?.usd || 0;

            volume =
              pair.volume?.h24 || 0;
          }

        } catch (error) {

          console.log(
            "Pump Pair Lookup Error:",
            error.message
          );
        }

        // =====================================
        // SCORE
        // =====================================

        const score =
          calculateScore({

            marketCap,
            liquidity,
            volume
          });

        const result =
          getSignal(score);

        // =====================================
        // REJECT WEAK TOKENS
        // =====================================

        if (!result.allowed) {

          console.log(
            `Rejected Coin: ${token.name}`
          );

          return;
        }

        // =====================================
        // AI ONLY FOR HIGH SCORES
        // =====================================

        let aiResult =
          "Skipped";

        if (score >= 75) {

          aiResult =
            await aiAnalyzeToken({

              name: token.name,
              marketCap,
              liquidity,
              volume
            });
        }

        // =====================================
        // SEND ALERT
        // =====================================

        await sendAlert(`

🚀 PUMPFUN SIGNAL ${result.signal}

🪙 ${token.name}

📄 Contract:
${token.mint}

💰 Market Cap:
$${marketCap.toLocaleString()}

💧 Liquidity:
$${liquidity.toLocaleString()}

📊 Volume:
$${volume.toLocaleString()}

📈 Score:
${score}/100

🧠 AI:
${aiResult}

⚡ Real-Time Alert

🔗 https://pump.fun/${token.mint}

`);

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
// START BOT
// =====================================

console.log(
  "🚀 FAST AI ALPHA BOT STARTED"
);

startPumpFun();

scanDexScreener();

// =====================================
// FAST SCAN SPEED
// =====================================

setInterval(
  scanDexScreener,
  5000
);