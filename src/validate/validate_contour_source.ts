import ValidationError from '../error/validation_error';
import getType from '../util/get_type';
import type {ContourSourceSpecification, StyleSpecification} from '../types.g';
import v8 from '../reference/v8.json' assert {type: 'json'};
import {deepUnbundle, unbundle} from '../util/unbundle_jsonlint';
import validateExpression from './validate_expression';

interface ValidateContourSourceOptions {
    sourceName?: string;
    value: ContourSourceSpecification;
    styleSpec: typeof v8;
    style: StyleSpecification;
    validateSpec: Function;
}

export default function validateContourSource(
    options: ValidateContourSourceOptions
): ValidationError[] {

    const contour = options.value;
    const styleSpec = options.styleSpec;
    const contourSpec = styleSpec.source_contour;
    const style = options.style;

    const errors = [];

    const rootType = getType(contour);
    if (contour === undefined) {
        return errors;
    } else if (rootType !== 'object') {
        errors.push(new ValidationError('source_contour', contour, `object expected, ${rootType} found`));
        return errors;
    }

    const source = contour.source;
    const sourceType = unbundle(style.sources?.[source]?.type);
    if (!source) {
        errors.push(new ValidationError('source_contour', contour, '"source" is required'));
    } else if (sourceType !== 'raster-dem') {
        errors.push(new ValidationError('source', source, `${options.sourceName} requires a raster-dem source`));
    }

    for (const key in contour) {
        const value = deepUnbundle(contour[key]);
        if (key === 'unit') {
            if (typeof value !== 'number' && value !== 'meters' && value !== 'feet') {
                errors.push(new ValidationError(key, value, `[meters, feet] or number expected, ${JSON.stringify(value)} found`));
            }
        } else if (key === 'intervals' || key === 'majorMultiplier') {
            errors.push(...validateExpression({
                key,
                value,
                validateSpec: options.validateSpec,
                expressionContext: `contour-${key}`
            }));
        } else if (contourSpec[key]) {
            errors.push(...options.validateSpec({
                key,
                value,
                valueSpec: contourSpec[key],
                validateSpec: options.validateSpec,
                style,
                styleSpec
            }));
        } else {
            errors.push(new ValidationError(key, value, `unknown property "${key}"`));
        }
    }

    return errors;
}
