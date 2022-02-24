import { ITargetValueChangeData } from '../..';

/**
 * 用户数值变更
 */
export class UserValueChange implements ITargetValueChangeData {
    /**
     * 数量
     */
    public count: number;
    public id: string;
    /**
     * 来源
     */
    public source: string;
    /**
     * 用户ID
     */
    public userID: string;
    /**
     * 数值类型
     */
    public valueType: number;
}