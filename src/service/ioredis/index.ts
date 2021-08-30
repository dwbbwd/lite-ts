import Ioredis from 'ioredis';

import { IRedisGeo, RedisBase } from '../../contract';

type RedisType = Ioredis.Cluster | Ioredis.Redis;

export class IoredisAdapter extends RedisBase {
    private m_SubCallbacks: { [key: string]: (message: string) => Promise<void>; } = {};

    private m_Client: RedisType;
    protected get client(): RedisType {
        if (this.m_Client == null)
            this.m_Client = this.m_Opt instanceof Array ? new Ioredis.Cluster(this.m_Opt) : new Ioredis(this.m_Opt);

        return this.m_Client;
    }

    private m_Sub: RedisType;
    protected get sub(): RedisType {
        if (this.m_Sub == null) {
            this.m_Sub = this.m_Opt instanceof Array ? new Ioredis.Cluster(this.m_Opt) : new Ioredis(this.m_Opt);
            this.m_Sub.on('message', (channel: string, message: string) => {
                if (this.m_SubCallbacks[channel])
                    this.m_SubCallbacks[channel](message).catch(console.log);
            });
        }

        return this.m_Sub;
    }

    public constructor(private m_Opt: Ioredis.RedisOptions | Ioredis.ClusterNode[]) {
        super();
    }

    public close() {
        this.client?.disconnect();
        this.sub?.disconnect();
    }

    public async del(key: string) {
        await this.client.del(key);
    }

    public async exists(key: string) {
        const count = await this.client.exists(key);
        return count > 0;
    }

    public async expire(key: string, seconds: number) {
        await this.client.expire(key, seconds);
    }

    public async get(key: string): Promise<string> {
        return this.client.get(key);
    }

    public async geoadd(key: string, ...values: IRedisGeo[]) {
        let args = values.reduce((memo: any[], r): any[] => {
            memo.push(r.longitude, r.latitude, r.member);
            return memo;
        }, []);
        return (this.client as any).geoadd(key, ...args);
    }

    public async geopos(key: string, ...members: string[]) {
        const res = await (this.client as any).geopos(key, ...members);
        return res.map((r: [string, string]): [number, number] => {
            return [parseFloat(r[0]), parseFloat(r[1])];
        });
    }

    public async hdel(key: string, ...fields: string[]) {
        return this.client.hdel(key, fields);
    }

    public async hget(key: string, field: string) {
        return this.client.hget(key, field);
    }

    public async hgetall(key: string) {
        return this.client.hgetall(key);
    }

    public async hlen(key: string) {
        return this.client.hlen(key);
    }

    public async hkeys(key: string) {
        return this.client.hkeys(key);
    }

    public async hset(key: string, field: string, value: string) {
        await this.client.hset(key, field, value);
    }

    public async hsetnx(key: string, field: string, value: string) {
        const res = await this.client.hsetnx(key, field, value);
        return res == 1;
    }

    public async incr(key: string) {
        return this.client.incr(key);
    }

    public async keys(pattern: string) {
        return this.client.keys(pattern);
    }

    public async lpop(key: string) {
        return this.client.lpop(key);
    }

    public async lpush(key: string, ...values: string[]) {
        return this.client.lpush(key, ...values);
    }

    public async lrange(key: string, start: number, stop: number) {
        return this.client.lrange(key, start, stop);
    }

    public async mget(...keys: string[]) {
        return this.client.mget(...keys);
    }

    public async publish(channel: string, message: any) {
        if (typeof message != 'string')
            message = JSON.stringify(message);
        await this.client.publish(channel, message);
    }

    public async rpop(key: string) {
        return this.client.rpop(key);
    }

    public async rpush(key: string, ...values: string[]) {
        return this.client.rpush(key, ...values);
    }

    public async set(key: string, value: string, ...args: any[]) {
        const res = await this.client.set(key, value, ...args);
        return res === 'OK';
    }

    public async time() {
        return this.client.time();
    }

    public async ttl(key: string) {
        return this.client.ttl(key);
    }

    public async unsubscribe(...channels: string[]) {
        channels.forEach(r => {
            delete this.m_SubCallbacks[r];
        });
        await this.sub.unsubscribe(channels);
    }
}