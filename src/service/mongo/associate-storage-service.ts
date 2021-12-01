import { DbFactoryBase, IAssociateStorageService } from '../../contract';

export class MongoAssociateStorageService implements IAssociateStorageService {
    private m_Associates: { [key: string]: any } = {};

    public constructor(
        private m_DbFactory: DbFactoryBase,
        private m_TargetIDs: string[]
    ) {
        if (!this.m_TargetIDs?.length)
            return;

        this.m_TargetIDs = this.m_TargetIDs.filter(r => {
            return r;
        });
        this.m_TargetIDs = [...new Set(this.m_TargetIDs)];
    }

    public add<T>(model: new () => T, column: string, entry: T) {
        if (!this.m_Associates[model.name])
            this.m_Associates[model.name] = {};

        const associateID = entry[column];
        if (!this.m_Associates[model.name][associateID])
            this.m_Associates[model.name][associateID] = [];

        this.m_Associates[model.name][associateID].push(entry);
    }

    public clear<T>(model: new () => T, associateID: string) {
        if (this.m_Associates[model.name] && this.m_Associates[model.name][associateID])
            this.m_Associates[model.name][associateID] = [];
    }

    public async find<T>(model: new () => T, column: string, associateID: string) {
        if (!this.m_Associates[model.name]) {
            const rows = await this.m_DbFactory.db(model).query().where({
                [column]: {
                    $in: this.m_TargetIDs
                }
            }).toArray();
            this.m_Associates[model.name] = rows.reduce((memo, r) => {
                if (!memo[r[column]])
                    memo[r[column]] = [];

                memo[r[column]].push(r);
                return memo;
            }, {});
        }

        return this.m_Associates[model.name][associateID] || [];
    }
}