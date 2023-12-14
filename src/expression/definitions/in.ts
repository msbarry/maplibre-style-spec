import {
    BooleanType,
    StringType,
    ValueType,
    NullType,
    toString,
    NumberType,
    isValidType,
    isValidNativeType,
} from '../types';
import RuntimeError from '../runtime_error';
import {typeOf} from '../values';

import type {Expression} from '../expression';
import type ParsingContext from '../parsing_context';
import type EvaluationContext from '../evaluation_context';
import type {Type} from '../types';
import Literal from './literal';

class In2 implements Expression {
    type: Type;
    needle: Expression;
    haystack: Expression;
    values: Set<any>;
    name = 'in';
    lastId: number = -1;
    lastValue: any = null;

    constructor(needle: Expression, haystack: Expression, values: Set<any>) {
        this.type = BooleanType;
        this.needle = needle;
        this.haystack = haystack;
        this.values = values;
    }

    evaluate(ctx: EvaluationContext) {
        if (this.lastId === ctx._feature._id) {
            return this.lastValue;
        }
        this.lastId = ctx._feature._id;
        return (this.lastValue = this._evaluate(ctx));
    }
    _evaluate(ctx: EvaluationContext) {
        const needle = this.needle.evaluate(ctx) as any;
        // const haystack = this.haystack.evaluate(ctx) as any;

        // if (!haystack) return false;

        if (
            !isValidNativeType(needle, ['boolean', 'string', 'number', 'null'])
        ) {
            throw new RuntimeError(
                `Expected first argument to be of type boolean, string, number or null, but found ${toString(
                    typeOf(needle)
                )} instead.`
            );
        }

        return this.values?.has(needle);
    }

    eachChild(fn: (_: Expression) => void) {
        fn(this.needle);
        fn(this.haystack);
    }

    outputDefined() {
        return true;
    }
}

class In implements Expression {
    type: Type;
    needle: Expression;
    haystack: Expression;

    constructor(needle: Expression, haystack: Expression) {
        this.type = BooleanType;
        this.needle = needle;
        this.haystack = haystack;
    }

    static parse(args: ReadonlyArray<unknown>, context: ParsingContext): Expression {
        if (args.length !== 3) {
            return context.error(`Expected 2 arguments, but found ${args.length - 1} instead.`) as null;
        }

        const needle = context.parse(args[1], 1, ValueType);

        const haystack = context.parse(args[2], 2, ValueType);

        if (!needle || !haystack) return null;

        if (!isValidType(needle.type, [BooleanType, StringType, NumberType, NullType, ValueType])) {
            return context.error(`Expected first argument to be of type boolean, string, number or null, but found ${toString(needle.type)} instead`) as null;
        }

        if (haystack instanceof Literal) {
            return new In2(needle, haystack, new Set(haystack.value as any));
        }

        return new In(needle, haystack);
    }

    evaluate(ctx: EvaluationContext) {
        const needle = (this.needle.evaluate(ctx) as any);
        const haystack = (this.haystack.evaluate(ctx) as any);

        if (!haystack) return false;

        if (!isValidNativeType(needle, ['boolean', 'string', 'number', 'null'])) {
            throw new RuntimeError(`Expected first argument to be of type boolean, string, number or null, but found ${toString(typeOf(needle))} instead.`);
        }

        if (!isValidNativeType(haystack, ['string', 'array'])) {
            throw new RuntimeError(`Expected second argument to be of type array or string, but found ${toString(typeOf(haystack))} instead.`);
        }

        return haystack.indexOf(needle) >= 0;
    }

    eachChild(fn: (_: Expression) => void) {
        fn(this.needle);
        fn(this.haystack);
    }

    outputDefined() {
        return true;
    }
}

export {In2};
export default In;
