const { pool } = require("../database");

async function findDeveloperIdentity(
  developerWallet,
  fundingWallet
) {

  try {

    // =====================================
    // 1. PRIMARY IDENTITY:
    // EXACT DEVELOPER WALLET
    // =====================================

    if (developerWallet) {

      const developer =
        await pool.query(
          `
          SELECT DISTINCT identity_id
          FROM developer_wallets
          WHERE developer_wallet = $1
          LIMIT 1
          `,
          [developerWallet]
        );

      if (developer.rows.length) {

        console.log(
          "✅ Identity Found (Developer Wallet)"
        );

        return developer.rows[0].identity_id;
      }

    }

    // =====================================
    // 2. FUNDING WALLET:
    // SUPPORTING EVIDENCE ONLY
    // =====================================

    if (fundingWallet) {

      const funding =
        await pool.query(
          `
          SELECT DISTINCT
            identity_id,
            developer_wallet
          FROM developer_wallets
          WHERE funding_wallet = $1
          LIMIT 1
          `,
          [fundingWallet]
        );

      if (funding.rows.length) {

        console.log(
          "🟡 Funding Wallet Previously Seen"
        );

        console.log(
          `Supporting Identity: ${funding.rows[0].identity_id}`
        );

        console.log(
          `Previously Linked Developer: ${funding.rows[0].developer_wallet}`
        );

        // IMPORTANT:
        // Funding wallet alone does NOT prove
        // this is the same developer.
        //
        // Therefore we DO NOT return
        // funding.rows[0].identity_id here.

      }

    }

    // No exact developer-wallet match.
    // processToken() will create a new identity.
    return null;

  } catch (error) {

    console.log(
      "Find Identity Error:",
      error.message
    );

    return null;
  }

}

// =====================================
// CREATE DEVELOPER IDENTITY
// =====================================

async function createDeveloperIdentity() {

  try {

    const result =
      await pool.query(

        `
        INSERT INTO developer_identity

        DEFAULT VALUES

        RETURNING identity_id
        `

      );

    const identityId =
      result.rows[0].identity_id;

    console.log(
      `New Identity Created: ${identityId}`
    );

    return identityId;

  } catch (error) {

    console.log(
      "Create Identity Error:",
      error.message
    );

    return null;

  }

}

// =====================================
// LINK WALLETS TO IDENTITY
// =====================================

async function linkWalletToIdentity(
  identityId,
  developerWallet,
  fundingWallet
) {

  try {

    if (!identityId) {

      console.log(
        "⚠️ Cannot link wallets without identityId"
      );

      return;

    }

    await pool.query(

      `
      INSERT INTO developer_wallets (

        identity_id,

        developer_wallet,

        funding_wallet

      )

      VALUES (

        $1,
        $2,
        $3

      )

      ON CONFLICT DO NOTHING
      `,

      [
        identityId,
        developerWallet,
        fundingWallet
      ]

    );

    console.log(
      `Wallets linked to Identity ${identityId}`
    );

  } catch (error) {

    console.log(
      "Link Wallet Error:",
      error.message
    );

  }

}

module.exports = {

  findDeveloperIdentity,

  createDeveloperIdentity,

  linkWalletToIdentity

};
