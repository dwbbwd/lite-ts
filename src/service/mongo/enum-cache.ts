import { MemoryCache } from '../cache';
import { EnumItem } from '../enum';
import { DbFactoryBase, ICache, ITraceable, NowTimeBase } from '../../contract';
import { global } from '../../model';

/**
 * 枚举缓存
 */
export class MongoEnumCache implements ICache, ITraceable {
    private m_Cache: ICache;
    /**
     * 缓存
     */
    protected get cache() {
        if (!this.m_Cache) {
            this.m_Cache = new MemoryCache(this.m_NowTime, async () => {
                const entries = await this.m_DbFactory.db(global.Enum).query().toArray();
                return entries.reduce((memo, r) => {
                    memo[r.id] = r.items.map(cr => {
                        return new EnumItem(cr, r.id, this.m_Sep);
                    });
                    return memo;
                }, {});
            });
        }

        return this.m_Cache;
    }

    /**
     * 构造函数
     * 
     * @param m_DbFactory 数据库工厂
     * @param m_NowTime 当前时间
     * @param m_Sep 分隔符, 默认: '-'
     */
    public constructor(
        private m_DbFactory: DbFactoryBase,
        private m_NowTime: NowTimeBase,
        private m_Sep = '-'
    ) { }

    /**
     * 清空
     */
    public flush() {
        this.cache.flush();
    }

    /**
     * 获取
     * 
     * @param key 键
     */
    public async get<T>(key: string) {
        return this.cache.get<T>(key);
    }

    /**
     * 跟踪
     * 
     * @param parentSpan 父跟踪范围
     */
    public withTrace(parentSpan: any) {
        return new MongoEnumCache(
            (this.m_DbFactory as any as ITraceable)?.withTrace(parentSpan) ?? this.m_DbFactory,
            this.m_NowTime,
            this.m_Sep
        );
    }
}