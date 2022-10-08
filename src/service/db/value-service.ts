import { opentracing } from 'jaeger-client';
import moment from 'moment';

import { CustomError } from '../error';
import {
    DbFactoryBase,
    DbRepositoryBase,
    EnumFactoryBase,
    IUnitOfWork,
    StringGeneratorBase,
    UserServiceBase,
    ValueInterceptorFactoryBase,
    ValueServiceBase,
} from '../../contract';
import { contract, enum_, global } from '../../model';

/**
 * 数据库数值服务
 */
export class DbValueService<
    T extends global.UserValue,
    TChange extends global.UserValueChange,
    TLog extends global.UserValueLog
> extends ValueServiceBase<T> {
    /**
     * 实体
     */
    public get entry() {
        return this.m_GetEntryFunc();
    }

    /**
     * 获取当前时间
     */
    public get now() {
        return this.userService.valueService.now;
    }

    /**
     * 构造函数
     * 
     * @param userService 用户服务
     * @param dbFactory 数据库工厂
     * @param stringGenerator 字符串生成器
     * @param valueInterceptorFactory 数值拦截器工厂
     * @param parentTracerSpan 跟踪范围
     * @param changeModel 数值变更模型
     * @param m_CreateEntryFunc 创建实体函数
     * @param m_CreateLogEntryFunc 创建日志实体函数
     * @param m_FindAndClearChangeEntriesPredicate 查询并清除变更数据断言
     * @param m_GetEntryFunc 获取实体函数
     * @param enumFactory 枚举工厂
     */
    public constructor(
        protected dbFactory: DbFactoryBase,
        protected stringGenerator: StringGeneratorBase,
        protected userService: UserServiceBase,
        protected valueInterceptorFactory: ValueInterceptorFactoryBase,
        protected parentTracerSpan: opentracing.Span,
        protected changeModel: new () => TChange,
        private m_CreateEntryFunc: () => T,
        private m_CreateLogEntryFunc: () => TLog,
        private m_FindAndClearChangeEntriesPredicate: (r: TChange) => boolean,
        private m_GetEntryFunc: () => Promise<T>,
        enumFactory: EnumFactoryBase,
    ) {
        super(enumFactory);
    }

    /**
     * 获取数值数量
     * 获取数值变更数据并清理缓存
     * 
     * @param uow 工作单元
     * @param valueType 数值类型
     */
    public async getCount(uow: IUnitOfWork, valueType: number) {
        const tracerSpan = this.parentTracerSpan ? opentracing.globalTracer().startSpan('value.getCount', {
            childOf: this.parentTracerSpan,
        }) : null;

        const changeEntries = await this.userService.associateService.findAndClear<TChange>(this.changeModel.name, this.m_FindAndClearChangeEntriesPredicate);
        const changeDb = this.dbFactory.db(this.changeModel, uow);
        if (changeEntries.length) {
            tracerSpan?.log?.({
                changes: changeEntries
            });

            for (const r of changeEntries)
                await changeDb.remove(r);
            await this.update(uow, changeEntries);
        }

        const res = await super.getCount(uow, valueType);
        tracerSpan?.log?.({
            valueType,
            result: res,
        })?.finish?.();
        return res;
    }

    /**
     * 更新数值
     * 
     * @param uow 工作单元
     * @param values 数值数据
     */
    public async update(uow: IUnitOfWork, values: contract.IValue[]) {
        const tracerSpan = this.parentTracerSpan ? opentracing.globalTracer().startSpan('value.update', {
            childOf: this.parentTracerSpan,
        }) : null;

        const newEntry = this.m_CreateEntryFunc();
        const db = this.dbFactory.db(newEntry.constructor as any, uow);
        let entry = await this.entry;
        if (!entry) {
            entry = newEntry;
            entry.values = {};
            await db.add(entry);

            this.userService.associateService.add(newEntry.constructor.name, entry);
        }

        let logDb: DbRepositoryBase<TLog>;
        const allValueTypeItem = await this.enumFactory.build(enum_.ValueTypeData).allItem;
        const nowUnix = await this.now;
        for (const r of values) {
            if (typeof r.valueType != 'number' || typeof r.count != 'number' || isNaN(r.count))
                continue;

            entry.values[r.valueType] ??= 0;

            if (!allValueTypeItem[r.valueType]?.data.isReplace && r.count == 0)
                continue;

            const interceptor = await this.valueInterceptorFactory.build(r);
            const isIntercepted = await interceptor.before(uow, this, r);
            if (isIntercepted)
                continue;

            const logEntry = this.m_CreateLogEntryFunc();
            if (!logDb)
                logDb = this.dbFactory.db(logEntry.constructor as any, uow);

            logEntry.id = await this.stringGenerator.generate();
            logEntry.oldCount = entry.values[r.valueType];
            logEntry.source = r.source;
            logEntry.valueType = r.valueType;

            if (allValueTypeItem[r.valueType]) {
                if (allValueTypeItem[r.valueType].data.isReplace) {
                    entry.values[r.valueType] = r.count;
                } else if (allValueTypeItem[r.valueType].data.dailyTime > 0) {
                    const oldUnix = entry.values[allValueTypeItem[r.valueType].data.dailyTime] || 0;
                    const isSameDay = moment.unix(nowUnix).isSame(
                        moment.unix(oldUnix),
                        'day'
                    );
                    if (!isSameDay) {
                        entry.values[r.valueType] = 0;
                        logEntry.source += '(每日重置)';
                    }

                    entry.values[allValueTypeItem[r.valueType].data.dailyTime] = nowUnix;
                    entry.values[r.valueType] += r.count;
                } else {
                    entry.values[r.valueType] += r.count;
                }
            } else {
                entry.values[r.valueType] += r.count;
            }

            if (entry.values[r.valueType] < 0 && !allValueTypeItem[r.valueType]?.data.isNegative) {
                entry.values[r.valueType] = logEntry.oldCount;
                throw new CustomError(enum_.ErrorCode.valueTypeNotEnough, {
                    consume: Math.abs(r.count),
                    count: logEntry.oldCount,
                    valueType: r.valueType,
                });
            }

            logEntry.count = entry.values[r.valueType];
            if (logEntry.oldCount != logEntry.count)
                await logDb.add(logEntry);

            await interceptor.after(uow, this, r);
        }

        await db.save(entry);

        tracerSpan?.log?.({ values })?.finish?.();
    }
}