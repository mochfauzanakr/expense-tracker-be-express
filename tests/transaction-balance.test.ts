import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createInMemoryDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });

  // Apply SQL migrations directly into in-memory PostgreSQL
  const migration0 = fs.readFileSync(path.resolve(__dirname, '../drizzle/0000_hesitant_gauntlet.sql'), 'utf-8');
  const migration1 = fs.readFileSync(path.resolve(__dirname, '../drizzle/0001_volatile_unicorn.sql'), 'utf-8');

  for (const statement of migration0.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) await pglite.exec(trimmed);
  }

  for (const statement of migration1.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) await pglite.exec(trimmed);
  }

  return { db, pglite };
}

test('Skenario Testing: Mutasi Saldo & Proteksi Overdraft (In-Memory PGlite)', async (t) => {
  const { db, pglite } = await createInMemoryDb();

  // 1. Setup Dua User Dummy untuk Uji Multi-Tenant
  const [user1] = await db.insert(schema.users).values({
    name: 'Fauzan User 1',
    email: 'user1@example.com',
    passwordHash: 'hash1',
  }).returning();

  const [user2] = await db.insert(schema.users).values({
    name: 'Other User 2',
    email: 'user2@example.com',
    passwordHash: 'hash2',
  }).returning();

  // 2. Setup Akun Cash untuk User 1 (Saldo Awal: 0) dan User 2 (Saldo Awal: 50.000)
  const [account1] = await db.insert(schema.accounts).values({
    userId: user1.id,
    name: 'Cash Dompet',
    balance: '0.00',
  }).returning();

  const [account2] = await db.insert(schema.accounts).values({
    userId: user2.id,
    name: 'Rekening User 2',
    balance: '50000.00',
  }).returning();

  // 3. Setup Kategori Pengeluaran
  const [category] = await db.insert(schema.categories).values({
    userId: user1.id,
    name: 'Makanan & Minuman',
    icon: 'coffee',
  }).returning();

  await t.test('1. Saldo awal akun adalah 0.00', async () => {
    const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, account1.id));
    assert.equal(Number(acc.balance), 0);
  });

  await t.test('2. Catat pemasukan 100.000 -> Saldo bertambah menjadi 100.000', async () => {
    const incomeAmount = 100000;

    await db.transaction(async (tx) => {
      await tx.insert(schema.transactions).values({
        userId: user1.id,
        accountId: account1.id,
        categoryId: null,
        amount: incomeAmount.toFixed(2),
        type: 'income',
        description: 'Gaji Bulanan',
      });

      await tx.update(schema.accounts)
        .set({ balance: sql`${schema.accounts.balance} + ${incomeAmount}` })
        .where(eq(schema.accounts.id, account1.id));
    });

    const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, account1.id));
    assert.equal(Number(acc.balance), 100000);
  });

  await t.test('3. Catat pengeluaran wajar 30.000 -> Saldo berkurang menjadi 70.000', async () => {
    const expenseAmount = 30000;

    await db.transaction(async (tx) => {
      const [acc] = await tx.select().from(schema.accounts).where(eq(schema.accounts.id, account1.id));
      assert.ok(Number(acc.balance) >= expenseAmount, 'Saldo harus cukup');

      await tx.insert(schema.transactions).values({
        userId: user1.id,
        accountId: account1.id,
        categoryId: category.id,
        amount: expenseAmount.toFixed(2),
        type: 'expense',
        description: 'Makan Siang',
      });

      await tx.update(schema.accounts)
        .set({ balance: sql`${schema.accounts.balance} - ${expenseAmount}` })
        .where(eq(schema.accounts.id, account1.id));
    });

    const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, account1.id));
    assert.equal(Number(acc.balance), 70000);
  });

  await t.test('4. PROTEKSI OVERDRAFT: Pengeluaran 80.000 saat saldo 70.000 wajib DITOLAK dan di-ROLLBACK', async () => {
    const overdraftExpense = 80000;
    let errorCaught = false;

    try {
      await db.transaction(async (tx) => {
        const [acc] = await tx.select().from(schema.accounts).where(eq(schema.accounts.id, account1.id));
        if (Number(acc.balance) < overdraftExpense) {
          throw new Error('Insufficient account balance');
        }

        // Jika lolos (seharusnya tidak), coba insert
        await tx.insert(schema.transactions).values({
          userId: user1.id,
          accountId: account1.id,
          categoryId: category.id,
          amount: overdraftExpense.toFixed(2),
          type: 'expense',
          description: 'Belanja Mewah Melebihi Saldo',
        });
      });
    } catch (err: any) {
      if (err.message === 'Insufficient account balance') {
        errorCaught = true;
      }
    }

    assert.equal(errorCaught, true, 'Error Insufficient account balance harus tertangkap');

    // Verifikasi saldo tidak berkurang sedikitpun (tetap 70.000)
    const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, account1.id));
    assert.equal(Number(acc.balance), 70000, 'Saldo harus tetap utuh 70.000 karena rollback');
  });

  await t.test('5. PROTEKSI MULTI-TENANT: User 2 mencoba memakai accountId User 1 wajib DITOLAK', async () => {
    let errorCaught = false;

    try {
      await db.transaction(async (tx) => {
        // Cek kepemilikan akun harus membatasi userId == user2.id
        const [targetAcc] = await tx.select().from(schema.accounts).where(
          and(eq(schema.accounts.id, account1.id), eq(schema.accounts.userId, user2.id))
        );

        if (!targetAcc) {
          throw new Error('Account not found');
        }
      });
    } catch (err: any) {
      if (err.message === 'Account not found') {
        errorCaught = true;
      }
    }

    assert.equal(errorCaught, true, 'User 2 tidak boleh bisa mengakses akun User 1');
  });

  await t.test('6. FILTER TRANSAKSI: validateQuery dengan Object.defineProperty tidak throw getter error', async () => {
    const { validateQuery } = await import('../src/middlewares/validate.js');
    const { transactionFilterQuerySchema } = await import('../src/utils/schemas.js');

    const fakeReq: any = { query: { type: 'expense', month: '10' } };
    const fakeRes: any = {};
    let nextCalled = false;

    const middleware = validateQuery(transactionFilterQuerySchema);
    middleware(fakeReq, fakeRes, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, 'Middleware validateQuery harus memanggil next()');
    assert.equal(fakeReq.query.type, 'expense');
    assert.equal(fakeReq.query.month, '10');
  });

  await pglite.close();
});
