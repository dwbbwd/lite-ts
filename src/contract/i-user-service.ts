import { IUserAssociateService } from './i-user-associate-service';
import { IUserRandSeedService } from './i-user-rand-seed-service';
import { IUserValueService } from './i-user-value-service';

/**
 * @deprecated IUserService -> UserServiceBase
 * 
 * 用户服务
 */
export interface IUserService {
    /**
     * 关联存储服务
     */
    readonly associateService: IUserAssociateService;
    /**
     * 数值服务
     */
    readonly valueService: IUserValueService;
    /**
     * 用户ID
     */
    readonly userID: string;
    /**
     * 获取随机种子服务
     * 
     * @param scene 场景
     */
    getRandSeedService(scene?: string): IUserRandSeedService;
}