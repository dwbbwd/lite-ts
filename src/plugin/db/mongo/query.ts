import { Cursor, FilterQuery } from 'mongodb';

import { Pool } from './pool';
import { docPK, modelPK, toEntries } from './helper';
import { DbQueryBase } from '../query-base';

export class Query<T> extends DbQueryBase<T> {
    private m_Skip: number;
    private m_Sorts: [string, 1 | -1][] = [];
    private m_Take: number;
    private m_Where: FilterQuery<any>;

    public constructor(private m_Pool: Pool, private m_Table: string) {
        super();
    }

    public async count(): Promise<number> {
        const cursor = await this.getCursor();
        return await cursor.count();
    }

    public order(...fields: string[]): this {
        return this.sort(1, ...fields);
    }

    public orderByDesc(...fields: string[]): this {
        return this.sort(-1, ...fields);
    }

    public skip(value: number): this {
        this.m_Skip = value;
        return this;
    }

    public take(value: number): this {
        this.m_Take = value;
        return this;
    }

    public async toArray(): Promise<T[]> {
        const cursor = await this.getCursor();
        const rows = await cursor.toArray();
        return toEntries(rows);
    }

    public where(filter: any): this {
        this.m_Where = modelPK in filter ? Object.keys(filter).reduce((memo, r): any => {
            memo[r == modelPK ? docPK : r] = filter[r];
            return memo;
        }, {}) : filter;
        return this;
    }

    private async getCursor(): Promise<Cursor<any>> {
        const db = await this.m_Pool.getDb();
        const cursor = db.collection(this.m_Table).find(this.m_Where);
        this.m_Where = null;

        if (this.m_Sorts.length) {
            cursor.sort(this.m_Sorts);
            this.m_Sorts = [];
        }

        if (this.m_Skip > 0) {
            cursor.skip(this.m_Skip);
            this.m_Skip = 0;
        }

        if (this.m_Take > 0) {
            cursor.limit(this.m_Take);
            this.m_Take = 0;
        }

        return cursor;
    }

    private sort(order: 1 | -1, ...fields: string[]): this {
        for (let r of fields) {
            if (r == modelPK)
                r = docPK;

            this.m_Sorts.push([r, order]);
        }
        return this;
    }
}
