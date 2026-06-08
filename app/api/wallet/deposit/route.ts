import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();

  try {
    const {
      userId, amount,
      cardholderName, cardLastFour, cardBrand,
      expiryMonth, expiryYear,
      billingAddress, billingCity, billingCountry,
      saveCard,
    } = await request.json();

    const parsedAmount = parseFloat(amount);
    if (!userId || isNaN(parsedAmount) || parsedAmount < 5 || parsedAmount > 10000) {
      return NextResponse.json({ error: 'Invalid deposit amount (must be $5–$10,000).' }, { status: 400 });
    }
    if (!cardholderName || !cardLastFour || !cardBrand || !expiryMonth || !expiryYear) {
      return NextResponse.json({ error: 'Missing card details.' }, { status: 400 });
    }

    await connection.beginTransaction();

    let paymentMethodId: number | null = null;
    if (saveCard) {
      const [pmResult]: any = await connection.execute(
        `INSERT INTO Payment_Methods
         (User_ID, Cardholder_Name, Card_Last_Four, Card_Brand, Expiry_Month, Expiry_Year,
          Billing_Address, Billing_City, Billing_Country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, cardholderName, cardLastFour, cardBrand, expiryMonth, expiryYear,
          billingAddress || null, billingCity || null, billingCountry || null,
        ]
      );
      paymentMethodId = pmResult.insertId;
    }

    await connection.execute(
      `UPDATE User_Wallets SET Available_Credits = Available_Credits + ? WHERE User_ID = ?`,
      [parsedAmount, userId]
    );

    const [walletRows]: any = await connection.execute(
      `SELECT Available_Credits, Escrow_Balance FROM User_Wallets WHERE User_ID = ?`,
      [userId]
    );
    const balanceAfter = parseFloat(walletRows[0].Available_Credits);

    const [txnResult]: any = await connection.execute(
      `INSERT INTO Wallet_Transactions
       (User_ID, Type, Amount, Balance_After, Description, Payment_Method_ID, Status)
       VALUES (?, 'deposit', ?, ?, ?, ?, 'completed')`,
      [
        userId, parsedAmount, balanceAfter,
        `${cardBrand} card deposit — ending ${cardLastFour}`,
        paymentMethodId,
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      transactionId: `TXN-${txnResult.insertId.toString().padStart(6, '0')}`,
      wallet: walletRows[0],
    }, { status: 200 });

  } catch (error) {
    await connection.rollback();
    console.error('Deposit API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    connection.release();
  }
}
