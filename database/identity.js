// =====================================
// FIND DEVELOPER IDENTITY
// =====================================

async function findDeveloperIdentity(
  developerWallet,
  fundingWallet,
  feePayer
) {

  try {

    // 1. Search by Funding Wallet

    if (fundingWallet) {

      const funding = await pool.query(

        `

        SELECT DISTINCT identity_id

        FROM developer_wallets

        WHERE funding_wallet = $1

        LIMIT 1

        `,

        [fundingWallet]

      );

      if (funding.rows.length) {

        console.log(
          "Identity Found (Funding Wallet)"
        );

        return funding.rows[0].identity_id;

      }

    }

    // 2. Search by Developer Wallet

    if (developerWallet) {

      const developer = await pool.query(

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
          "Identity Found (Developer Wallet)"
        );

        return developer.rows[0].identity_id;

      }

    }

    // 3. Search by Fee Payer

    if (feePayer) {

      const payer = await pool.query(

        `

        SELECT DISTINCT identity_id

        FROM developer_wallets

        WHERE fee_payer = $1

        LIMIT 1

        `,

        [feePayer]

      );

      if (payer.rows.length) {

        console.log(
          "Identity Found (Fee Payer)"
        );

        return payer.rows[0].identity_id;

      }

    }

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

    const result = await pool.query(

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

  fundingWallet,

  feePayer

) {

  try {

    await pool.query(

      `

      INSERT INTO developer_wallets (

        identity_id,

        developer_wallet,

        funding_wallet,

        fee_payer

      )

      VALUES (

        $1,

        $2,

        $3,

        $4

      )

      ON CONFLICT (

        developer_wallet,

        funding_wallet,

        fee_payer

      )

      DO UPDATE

      SET

        last_seen = NOW()

      `,

      [

        identityId,

        developerWallet,

        fundingWallet,

        feePayer

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
