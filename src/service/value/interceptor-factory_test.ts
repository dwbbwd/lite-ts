import { strictEqual } from 'assert';

import { ValueIntercept } from './interceptor-decorator';
import { ValueInterceptorFactory as Self } from './interceptor-factory';
import { valueInterceptorMetadata } from './interceptor-metadata';
import { NullValueInterceptor } from './null-interceptor';
import { Mock } from '../assert';
import { EnumFactoryBase, IEnum, IValueInterceptor } from '../../contract';
import { contract, enum_ } from '../../model';

@ValueIntercept((data: enum_.ValueTypeData) => {
    return data.value == 10;
})
class PredicateValueInterceptor implements IValueInterceptor {
    public async after() { }

    public async before() {
        return false;
    }
}

@ValueIntercept(1)
class ValueTypeValueInterceptor implements IValueInterceptor {
    public async after() { }

    public async before() {
        return false;
    }
}

describe('src/service/value/interceptor-factory.ts', () => {
    describe('.build(valueType: number)', () => {
        it('predicate', async () => {
            const mockEnumFactory = new Mock<EnumFactoryBase>();
            const self = new Self(mockEnumFactory.actual);

            const mockEnum = new Mock<IEnum<enum_.ValueTypeData>>();
            mockEnumFactory.expectReturn(
                r => r.build(enum_.ValueTypeData),
                mockEnum.actual
            );

            mockEnum.expectReturn(
                r => r.getByValue(10),
                {
                    data: {
                        value: 10
                    }
                }
            );

            const res = await self.build({
                valueType: 10
            } as contract.IValue);
            strictEqual(res.constructor, PredicateValueInterceptor);
            strictEqual(valueInterceptorMetadata.valueType[10], PredicateValueInterceptor);
        });

        it('valueType', async () => {
            const self = new Self(null);

            const res = await self.build({
                valueType: 1
            } as contract.IValue);
            strictEqual(res.constructor, ValueTypeValueInterceptor);
        });

        it('skip', async () => {
            const self = new Self(null);

            const res = await self.build({
                isSkipIntercept: true,
                valueType: 1,
            } as contract.IValue);
            strictEqual(res.constructor, NullValueInterceptor);
        });
    });
});