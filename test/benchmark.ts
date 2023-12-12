import Benchmark from 'benchmark';
import {EvaluationContext, StyleExpression, expression} from '../src/style-spec.js';

import  style from './americana.json' assert {type:'json'};
import {VectorTile, VectorTileFeature} from '@mapbox/vector-tile';
import Pbf from 'pbf';

const layers = style
    .filter((layer) => layer['source-layer'] === 'transportation' && layer.filter)
    .map((layer) => expression.createExpression(layer.filter).value)
    .flatMap((result) => result instanceof StyleExpression ? [result.expression] : []);

const suite = new Benchmark.Suite();

async function addTest(name, z, x, y) {
    const tile = await (
        await fetch(
            `https://d1zqyi8v6vm8p9.cloudfront.net/planet/${z}/${x}/${y}.mvt`
        )
    ).arrayBuffer();

    const transportation = new VectorTile(new Pbf(tile)).layers['transportation'];
    const features: VectorTileFeature[] = [];

    for (let i = 0; i < transportation.length; i++) {
        features.push(transportation.feature(i));
    }
    suite.add(`evaluate expressions ${name}`, () => {
        let num = 0;
        const context: EvaluationContext = new EvaluationContext();
        for (const layer of layers) {
            for (const feature of features) {
                context.feature = feature;
                if (layer.evaluate(context)) {
                    num++;
                }
            }
        }
    });
}

await addTest('nyc z12', 12, 1207, 1539);
await addTest('boston z12', 12, 1239, 1514);
await addTest('kansas z14', 14, 3707, 6302);

suite
    .on('error', (event) => console.log(event.target.error))
    .on('cycle', (event) => {
        const time = 1_000 / event.target.hz;
        console.log(`${time.toPrecision(4)}ms ${event.target}`);
    })
    .run();
