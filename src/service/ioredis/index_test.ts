import { deepStrictEqual, ifError, ok, strictEqual } from 'assert';
import Ioredis from 'ioredis';

import { IoredisAdapter as Self } from './index';
import { sleep } from '../set-timeout';
import { IRedisGeoData } from '../../contract';

const cfg = {
    host: '127.0.0.1',
    port: 6379,
};
let client: Ioredis.Redis, self: Self, sub: Ioredis.Redis;

describe('src/service/ioredis/index.ts', () => {
    after(() => {
        client.disconnect();
        self.close();
        sub.disconnect();
    });

    before(() => {
        client = new Ioredis(cfg);
        self = new Self(cfg);
        sub = new Ioredis(cfg);
    });

    describe('.blpop(...keys: string[])', () => {
        it('ok', async () => {
            const key = 'test-blpop-ok';
            await client.rpush(key, 'a', 'b');

            const res = await self.blpop(5, key);
            deepStrictEqual(res, [key, 'a']);

            await client.del(key);
        });

        it('不存在', async () => {
            const key = 'test-blpop-not-exists';
            const res = await self.blpop(1, key);
            strictEqual(res, null);
        });
    });

    describe('.brpop(timeout: number, ...keys: string[])', () => {
        it('ok', async () => {
            const key = 'test-brpop-ok';
            await client.rpush(key, 'a', 'b');

            const res = await self.brpop(5, key);
            deepStrictEqual(res, [key, 'b']);

            await client.del(key);
        });

        it('不存在', async () => {
            const key = 'test-brpop-not-exists';
            const res = await self.brpop(1, key);
            strictEqual(res, null);
        });
    });

    describe('.del(k: string): Promise<void>', () => {
        let key = 'del';
        it('exist', async () => {
            await client.set(key, key);

            await self.del(key);

            const res = await client.get(key);
            strictEqual(res, null);
        });

        it('not exist', async () => {
            let err: Error;
            try {
                await self.del(`${key}-not-exists`);
            } catch (ex) {
                err = ex;
            }
            strictEqual(err, undefined);
        });
    });

    describe('.get(k: string): Promise<string>', () => {
        const key = 'get';
        it('ok', async () => {
            await client.set(key, 'aa');

            const res = await self.get(key);
            strictEqual(res, 'aa');

            await client.del(key);
        });
    });

    describe('.expire(key: string, seconds: number): Promise<void>', () => {
        const key = 'expire';
        it('ok', async () => {
            await client.set(key, 'expire');

            let err: Error;
            try {
                await self.expire(key, 10);
            } catch (ex) {
                err = ex;
            }

            const ttl = await client.ttl(key);
            await self.del(key);

            strictEqual(err, undefined);
            ok(ttl > 0);
        });
    });

    describe('.geoadd(key: string, ...entries: IRedisGeo[]): Promise<number>', () => {
        it('ok', async () => {
            const key = 'test-geoadd';
            const message: IRedisGeoData = {
                longitude: 0.10000079870223999,
                latitude: 0.20000090571705442,
                member: 'a',
            };
            await self.geoadd(key, message);

            const res = await (client as any).geopos(key, message.member);
            await client.del(key);

            deepStrictEqual(res, [[message.longitude.toString(), message.latitude.toString()]]);
        });
    });

    describe('.geopos(key: string, ...members: string[]): Promise<[number, number][]>', () => {
        it('ok', async () => {
            const key = 'test-geopos';
            const entry: IRedisGeoData = {
                longitude: 0.10000079870223999,
                latitude: 0.20000090571705442,
                member: 'c',
            };
            await (client as any).geoadd(key, entry.longitude, entry.latitude, entry.member);

            const res = await self.geopos(key, entry.member);
            await client.del(key);

            deepStrictEqual(res, [[entry.longitude, entry.latitude]]);
        });
    });

    describe('.hdel(key: string, ...fields: string[]): Promise<number>', () => {
        const key = 'hdel';
        it('ok', async () => {
            await client.hset(key, 'a', 1);
            await client.hset(key, 'b', 2);
            await client.hset(key, 'c', 3);

            const res = await self.hdel(key, 'a', 'd');

            await client.del(key);

            strictEqual(res, 1);
        });
    });

    describe('.hget(k: string, f: string): Promise<string>', () => {
        const key = 'hget';
        it('exists', async () => {
            await client.hset(key, 'a', 'aa');

            const res = await self.hget(key, 'a');

            await client.del(key);

            strictEqual(res, 'aa');
        });

        it('not exist', async () => {
            const res = await self.hget(key, 'b');
            strictEqual(res, null);
        });
    });

    describe('.hgetall(key: string): Promise<{ [key: string]: string }>', () => {
        const key = 'hgetall';
        it('exists', async () => {
            await client.hset(key, 'a', 1);
            await client.hset(key, 'b', 2);
            await client.hset(key, 'c', 3);

            const res = await self.hgetall(key);
            await client.del(key);

            deepStrictEqual(res, {
                a: '1',
                b: '2',
                c: '3',
            });
        });

        it('not exist', async () => {
            const res = await self.hgetall(key);
            deepStrictEqual(res, {});
        });
    });

    describe('.hlen(key:string): Promise<number>', () => {
        const key = 'hlen';
        it('ok', async () => {
            await client.hset(key, 'a', 1);
            await client.hset(key, 'b', 2);
            await client.hset(key, 'c', 3);

            const res = await self.hlen(key);

            await client.del(key);

            strictEqual(res, 3);
        });

        it('not exists', async () => {
            const res = await self.hlen(key);

            await client.del(key);

            strictEqual(res, 0);
        });
    });

    describe('.hkeys(key: string): Promise<string[]>', () => {
        const key = 'hkeys';
        it('ok', async () => {
            await client.hset(key, 'a', 1);
            await client.hset(key, 'b', 2);
            await client.hset(key, 'c', 3);

            const res = await self.hkeys(key);

            await client.del(key);

            deepStrictEqual(res, ['a', 'b', 'c']);
        });
    });

    describe('.hset(k: string, f: string, v: string): Promise<void>', () => {
        const key = 'hset';
        it('exists', async () => {
            await client.hset(key, 'a', 'aaa');

            await self.hset(key, 'a', 'aaaa');

            const res = await client.hget(key, 'a');
            strictEqual(res, 'aaaa');

            await client.del(key);
        });

        it('not exist', async () => {
            await self.hset(key, 'b', 'bb');

            const res = await client.hget(key, 'b');
            strictEqual(res, 'bb');

            await client.del(key);
        });
    });

    describe('.hsetnx(key: string, field: string, value: string): Promise<boolean>', () => {
        const key = 'hsetnx';
        it('exists', async () => {
            await client.hset(key, 'a', 'aaa');

            const res = await self.hsetnx(key, 'a', 'aaaa');

            await client.del(key);

            strictEqual(res, false);
        });

        it('not exist', async () => {
            const res = await self.hsetnx(key, 'b', 'bb');

            await client.del(key);

            strictEqual(res, true);
        });
    });

    describe('.incr(key: string): Promise<number>', () => {
        const key = 'incr';
        it('ok', async () => {
            const res = await self.incr(key);
            await client.del(key);

            strictEqual(res, 1);
        });
    });

    describe('.keys(pattern: string)', () => {
        const key = 'test-keys';
        it('all', async () => {
            await client.set(key, 'v');

            const res = await self.keys('*');
            deepStrictEqual(res, [key]);

            await client.del(key);
        });
    });

    describe('.lpop(key: string): Promise<string>', () => {
        it('ok', async () => {
            const key = 'test-lpop-ok';
            await client.rpush(key, 'a', 'b');

            const res = await self.lpop(key);

            await client.del(key);

            strictEqual(res, 'a');
        });

        it('empty', async () => {
            const key = 'test-lpop-empty';

            const res = await self.lpop(key);
            strictEqual(res, null);
        });
    });

    describe('.lpush(key: string, ...values: string[]): Promise<number>', () => {
        it('ok', async () => {
            const key = 'test-lpush-ok';
            await self.lpush(key, 'aa');

            const res = await client.lpop(key);
            await client.del(key);

            strictEqual(res, 'aa');
        });
    });

    describe('.lrange(key: string, start: number, stop: number): Promise<string[]>', () => {
        it('ok', async () => {
            const key = 'test-lrange';
            await client.rpush(key, 'a');
            await client.rpush(key, 'b');
            await client.rpush(key, 'c');

            const res = await self.lrange(key, 0, -1);

            await client.del(key);

            deepStrictEqual(res, ['a', 'b', 'c']);
        });
    });

    describe('.mget(...keys: string[]): Promise<string[]>', () => {
        it('ok', async () => {
            const keys = ['a', 'b', 'c'];
            for (const r of keys) {
                await client.set(r, r);
            }

            const res = await self.mget(...keys);

            for (const r of keys) {
                await client.del(r);
            }

            deepStrictEqual(res, keys);
        });
    });

    describe('.rpop(key: string): Promise<string>', () => {
        it('ok', async () => {
            const key = 'test-rpop-ok';
            await self.lpush(key, 'aaa', 'bbb');

            const res = await self.rpop(key);
            await client.del(key);

            strictEqual(res, 'aaa');
        });
    });

    describe('.rpush(key: string, ...values: string[]): Promise<number>', () => {
        it('ok', async () => {
            const key = 'test-rpush-ok';
            const res = await self.rpush(key, 'r1', 'r2');

            const res2 = await client.llen(key);
            await client.del(key);

            strictEqual(res, 2);
            strictEqual(res2, 2);
        });
    });

    describe('.publish(channel: string, message: any): Promise<number>', () => {
        it('ok', async () => {
            let pChannel = 'p-c';
            let pMessage = 'p-m';
            let sChannel: string, sMessage: string;
            await sub.subscribe(pChannel);
            sub.on('message', (channel: string, message: string): void => {
                sChannel = channel;
                sMessage = message;
            });

            await self.publish(pChannel, pMessage);

            for (let i = 0; i < 5; i++) {
                if (sChannel && sMessage)
                    break;

                await sleep(10);
            }

            strictEqual(sChannel, pChannel);
            strictEqual(sMessage, pMessage);
        });
    });

    describe('.set(k: string, v: string, ...args: any[])', () => {
        it('only key, value', async () => {
            const key = 'set.keyAndValue';
            await self.set(key, key);

            const value = await client.get(key);
            await client.del(key);

            strictEqual(key, value);
        });

        it('key, value, expiryMode, value', async () => {
            let key = 'set.expiryMode';
            await self.set(key, key, 'EX', 1);

            let value = await client.get(key);
            strictEqual(key, value);

            await sleep(1100);

            value = await client.get(key);
            ifError(value);
        });

        it('key, value, nx', async () => {
            let key = 'set.setMode';
            let res1 = await self.set(key, key, 'NX');

            let value = 'changed';
            let res2 = await self.set(key, value, 'NX');

            let redisValue = await client.get(key);

            await client.del(key);

            strictEqual(res1, true);
            strictEqual(res2, false);
            strictEqual(redisValue, key);
        });
    });

    describe('.ttl(key: string): Promise<number>', () => {
        it('key not exsits', async () => {
            const key = 'ttl-key-not-exists';
            const res = await self.ttl(key);
            strictEqual(res, -2);
        });

        it('not expire', async () => {
            const key = 'ttl-not-expire';
            await client.set(key, key);

            const res = await self.ttl(key);

            await client.del(key);

            strictEqual(res, -1);
        });

        it('has expire', async () => {
            const key = 'ttl-has-expire';
            await client.set(key, key, 'ex', 10);

            const res = await self.ttl(key);

            await client.del(key);

            ok(res > 0 && res <= 10);
        });
    });
});
