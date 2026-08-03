// =====================================
// FIND DEVELOPER IDENTITY
// =====================================

async function findDeveloperIdentity(
  developerWallet,
  fundingWallet,
  feePayer
) {

  // 1. Search by Funding Wallet
  if (fundingWallet) {

    const funding = await pool.query(

      `

      SELECT identity_id

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

      SELECT identity_id

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

      SELECT identity_id

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

}

module.exports = {
  findDeveloperIdentity
};
