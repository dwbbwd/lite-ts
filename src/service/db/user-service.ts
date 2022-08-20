import { DbUserValueService } from './user-value-service';
import {
    DbFactoryBase,
    EnumFactoryBase,
    ITargetValueService,
    IUserAssociateService,
    IUserValueService,
    NowTimeBase,
    RpcBase,
    StringGeneratorBase,
    UserServiceBase,
    ValueInterceptorFactoryBase,
} from '../../contract';
import { enum_, global } from '../../model';
import { opentracing } from 'jaeger-client';

/**
 * 用户服务
 */
export class DbUserService extends UserServiceBase {
    /**
     * 创建目标数值服务函数
     */
    public static buildTargetValueServiceFunc: (
        enumFactory: EnumFactoryBase,
        rpc: RpcBase,
        userService: UserServiceBase,
        targetTypeData: enum_.TargetTypeData,
        userID: string,
    ) => ITargetValueService<global.UserTargetValue>;

    /**
     * 目标数值服务
     */
    private m_TargetTypeValueService: { [targetType: number]: ITargetValueService<global.UserTargetValue> } = {};

    private m_ValueService: IUserValueService;
    /**
     * 用户数值服务
     */
    public get valueService() {
        this.m_ValueService ??= new DbUserValueService(
            this,
            this.nowValueType,
            this.dbFactory,
            this.enumFactory,
            this.nowTime,
            this.stringGenerator,
            this.valueInterceptorFactory,
            this.parentSpan,
        );
        return this.m_ValueService;
    }

    /**
     * 构造函数
     * 
     * @param dbFactory 数据库工厂
     * @param nowTime 当前时间
     * @param stringGenerator 字符串生成器
     * @param valueInterceptorFactory 数值拦截器工厂
     * @param parentSpan 父范围
     * @param nowValueType 当前时间数值类型
     * @param associateService 关联存储服务
     * @param enumFactory 枚举工厂
     * @param rpc 远程过程调用
     * @param userID 用户ID
     */
    public constructor(
        protected dbFactory: DbFactoryBase,
        protected nowTime: NowTimeBase,
        protected stringGenerator: StringGeneratorBase,
        protected valueInterceptorFactory: ValueInterceptorFactoryBase,
        protected nowValueType: number,
        protected parentSpan: opentracing.Span,
        associateService: IUserAssociateService,
        enumFactory: EnumFactoryBase,
        rpc: RpcBase,
        userID: string,
    ) {
        super(associateService, userID, enumFactory, rpc);
    }

    /**
     * 获取目标数值服务
     * 
     * @param targetType 目标类型
     */
    public async getTargetValueService(targetType: number) {
        if (targetType == 0)
            throw new Error('无法用此方法获取用户数值服务');

        const items = await this.enumFactory.build(enum_.TargetTypeData).items;
        if (!items[targetType])
            throw new Error(`无效目标类型: ${targetType}`);

        this.m_TargetTypeValueService[targetType] ??= DbUserService.buildTargetValueServiceFunc(this.enumFactory, this.rpc, this, items[targetType].data, this.userID);
        return this.m_TargetTypeValueService[targetType];
    }
}