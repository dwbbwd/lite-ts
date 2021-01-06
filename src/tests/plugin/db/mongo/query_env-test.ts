import { deepStrictEqual, strictEqual } from 'assert';

import { docPK, toEntries } from '../../../../plugin/db/mongo/helper';
import { Pool } from '../../../../plugin/db/mongo/pool';
import { Query as Self } from '../../../../plugin/db/mongo/query';

const pool = new Pool('test-query', 'mongodb://localhost:27017');

describe('src/plugin/db/mongo/query.ts', (): void => {
    after(
        async (): Promise<void> => {
            const db = await pool.getDb();
            await db.dropDatabase();

            const client = await pool.getClient();
            await client.close();
        }
    );

    describe('.count(): Promise<number>', (): void => {
        const table = 'test-query-count';
        it('empty', async (): Promise<void> => {
            const count = await new Self(pool, table).count();
            strictEqual(count, 0);
        });

        it('all', async (): Promise<void> => {
            const rows = [{
                [docPK]: `${table}-1`,
            }, {
                [docPK]: `${table}-2`,
            }];
            const db = await pool.getDb();
            const collection = db.collection(table);
            await collection.insertMany(rows);

            const count = await new Self(pool, table).count();

            await collection.deleteMany(null);

            strictEqual(count, rows.length);
        });
    });

    describe('.order(...fields)', () => {
        const table = 'test-query-order';
        it('ok', async (): Promise<void> => {
            const rows = [{
                [docPK]: `${table}-3`,
                index: 1,
            }, {
                [docPK]: `${table}-4`,
                index: 0,
            }, {
                [docPK]: `${table}-5`,
                index: -1,
            }];
            const db = await pool.getDb();
            const collection = db.collection(table);
            await collection.insertMany(rows);

            const res = await new Self(pool, table).order('index').toArray();

            await collection.deleteMany(null);

            deepStrictEqual(
                res,
                toEntries([rows[2], rows[1], rows[0]])
            );
        });
    });

    describe('.orderByDesc(...fields)', () => {
        const table = 'test-query-orderByDesc';
        it('ok', async () => {
            const rows = [{
                [docPK]: `${table}-6`,
                index: 1,
            }, {
                [docPK]: `${table}-7`,
                index: 2,
            }];
            const db = await pool.getDb();
            const collection = db.collection(table);
            await collection.insertMany(rows);

            const res = await new Self(pool, table).orderByDesc('index').toArray();

            await collection.deleteMany(null);

            deepStrictEqual(
                res,
                toEntries([rows[1], rows[0]])
            );
        });
    });

    describe('.skip(skip)', () => {
        const table = 'test-query-skip';
        it('ok', async () => {
            const rows = [{
                [docPK]: `${table}-8`,
            }, {
                [docPK]: `${table}-9`,
            }];
            const db = await pool.getDb();
            const collection = db.collection(table);
            await collection.insertMany(rows);

            const res = await new Self(pool, table).skip(1).toArray();

            await collection.deleteMany(null);

            deepStrictEqual(
                res,
                toEntries([rows[1]])
            );
        });
    });

    describe('.take(take)', () => {
        const table = 'test-query-take';
        it('ok', async () => {
            const rows = [{
                [docPK]: `${table}-10`,
            }, {
                [docPK]: `${table}-11`,
            }, {
                [docPK]: `${table}-12`,
            }];
            const db = await pool.getDb();
            const collection = db.collection(table);
            await collection.insertMany(rows);

            const res = await new Self(pool, table).take(1).toArray();

            await collection.deleteMany(null);

            deepStrictEqual(
                res,
                toEntries([rows[0]])
            );
        });
    });

    describe('.toArray()', () => {
        const table = 'test-query-toArray';
        it('ok', async () => {
            const rows = [{
                [docPK]: `${table}-1`,
            }, {
                [docPK]: `${table}-2`,
            }];
            const db = await pool.getDb();
            const collection = db.collection(table);
            await collection.insertMany(rows);

            const res = await new Self(pool, table).toArray();

            await collection.deleteMany(null);

            deepStrictEqual(
                res,
                toEntries(rows)
            );
        });
    });

    describe('.where(selector)', () => {
        const table = 'test-query-where';
        it('ok', async () => {
            let rows = [{
                [docPK]: `${table}-13`,
                type: 1,
            }, {
                [docPK]: `${table}-14`,
                type: 2,
            }, {
                [docPK]: `${table}-15`,
                type: 1,
            }];
            const db = await pool.getDb();
            let collection = db.collection(table);
            await collection.insertMany(rows);

            let res = await new Self(pool, table).where({
                type: 1,
            }).toArray();

            await collection.deleteMany(null);

            deepStrictEqual(
                res,
                toEntries([rows[0], rows[2]])
            );
        });
    });
});
