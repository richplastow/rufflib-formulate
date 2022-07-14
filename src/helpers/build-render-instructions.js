// rufflib-formulate/src/helpers/build-render-instructions.js


/* --------------------------------- Import --------------------------------- */

import Validate from 'rufflib-validate';

import { ID_PREFIX, RX_IDENTIFIER, RX_META_TITLE, RX_PATH } from './constants.js';


/* -------------------------- Public Class Helpers -------------------------- */

// Transforms a Formulate schema and path into a list of steps. Each step is
// either an instruction for creating an HTML element, or the special
// 'fieldsetUp' instruction.
export function buildRenderInstructions(schema, path=ID_PREFIX, depth=1, skipValidation=false) {

    // Validate the constructor arguments, unless `skipValidation` is true.
    // Note that `v.schema()` is already recursive, so only needs running once.
    const v = new Validate('buildRenderInstructions()', skipValidation);
    if (depth === 1 && ! v.schema(schema, `(schema) ${path}`))
        return { error:v.err };
    if (! v.object(schema._meta, `(schema) ${path}._meta`, {
            _meta:{}, title:{ kind:'string', rule:RX_META_TITLE } })
     || ! v.string(path, 'path', RX_PATH)
     || ! v.integer(depth, 'depth', 1, 3) // maximum three levels deep @TODO consider increasing this
    ) return { error:v.err };

    // Create a list of steps. The first step is always an instruction to render
    // a <FIELDSET> element.
    const steps = [{
        depth,
        height: 1,
        id: path,
        kind: 'fieldsetDown',
        title: schema._meta.title,
    }];
    const fieldsetDownRef = steps[0];

    // Step through each property in the schema object.
    for (let key in schema) {
        const val = schema[key];

        // Ignore the `_meta` object.
        if (key === '_meta') continue;

        // If the value contains a 'kind' property, build an instruction for
        // rendering a field.
        if (val.kind) {
            const id = `${path}.${key}`;
            const v = new Validate('buildRenderInstructions()', skipValidation);
            if (! v.string(key, 'key', RX_IDENTIFIER) // must not contain a dot
             || ! v.string(id, 'id', RX_PATH) // must be be too long
            ) return { error:v.err };
            steps.push({ id, kind:val.kind });
            fieldsetDownRef.height++;
            continue;
        }

        // The value does not contain a 'kind' property, so build an instruction
        // for rendering a sub-fieldset.
        const result = buildRenderInstructions(
            val, // `val` should be a sub-schema
            `${path}.${key}`, // the path is dot-delimited
            depth + 1, // recurse down a level
            skipValidation, // some of the validation needs doing on each recurse
        );
        if (result.error) return result;
        const subSteps = result.steps;
        fieldsetDownRef.height += subSteps[0].height;
        steps.push(...subSteps); // spread syntax, keeps the array 1 dimensional
    }

    // The last step is an instruction that the <FIELDSET> element at `steps[0]`
    // has ended. Everything between the first and last instruction should be
    // nested inside that <FIELDSET> element.
    steps.push({ kind:'fieldsetUp' });
    return { steps };
}


/* ---------------------------------- Tests --------------------------------- */

// Tests buildRenderInstructions().
export function testBuildRenderInstructions(expect) {
    expect().section('buildRenderInstructions()');

    const funct = buildRenderInstructions;
    const nm = 'buildRenderInstructions';

    // Is a function, with skippable validation.
    expect(`typeof ${nm}`,
            typeof funct).toBe('function');
    expect(`${nm}({_meta:{title:'Abc'}}, 'xyz', 0, true)`,
            funct({_meta:{title:'Abc'}}, 'xyz', 0, true)).toJson({
                error: undefined,
                steps: [
                    { depth:0, height:1, id:'xyz', kind:'fieldsetDown', title:'Abc' },
                    { kind:'fieldsetUp'}
                ]
            });

    // Typical invalid arguments.
    expect(`${nm}()`,
            funct()).toError(
            `${nm}(): '(schema) rl_f' is type 'undefined' not an object`);
    expect(`${nm}({})`,
            funct({})).toError(
            `${nm}(): '(schema) rl_f._meta' is type 'undefined' not an object`);
    expect(`${nm}({_meta:{}})`,
            funct({_meta:{}})).toError(
            `${nm}(): '(schema) rl_f._meta.title' is type 'undefined' not 'string'`);
    expect(`${nm}({_meta:{title:'Abc'}}, 123)`,
            funct({_meta:{title:'Abc'}}, 123)).toError(
            `${nm}(): 'path' is type 'number' not 'string'`);
    expect(`${nm}({_meta:{title:'Abc'}}, 'xy-z')`,
            funct({_meta:{title:'Abc'}}, 'xy-z')).toError(
            `${nm}(): 'path' "xy-z" fails /^[_a-z][._0...54}$/`);
    expect(`${nm}({_meta:{title:'Abc'}}, 'xyz', 1.5)`,
            funct({_meta:{title:'Abc'}}, 'xyz', 1.5)).toError(
            `${nm}(): 'depth' 1.5 is not an integer`);
    expect(`${nm}({_meta:{title:'Abc'}}, 'xyz', 0)`,
            funct({_meta:{title:'Abc'}}, 'xyz', 0)).toError(
            `${nm}(): 'depth' 0 is < 1`);

    // Path too long, depth too deep.
    expect(`${nm}({_meta:{title:'Abc'}}, 'a'.repeat(256))`,
            funct({_meta:{title:'Abc'}}, 'a'.repeat(256))).toError(
            `${nm}(): 'path' "aaaaaaaaaaa...aaaa" fails /^[_a-z][._0...54}$/`);
    expect(`${nm}({_meta:{title:'Abc'},zzzzz:{kind:'boolean'}}, 'a'.repeat(250))`,
            funct({_meta:{title:'Abc'},zzzzz:{kind:'boolean'}}, 'a'.repeat(250))).toError(
            `${nm}(): 'id' "aaaaaaaaaaa...zzzz" fails /^[_a-z][._0...54}$/`);
    expect(`${nm}({_meta:{title:'A'},b:{_meta:{title:'B'},c:{_meta:{title:'C'},d:{_meta:{title:'D'}}}}}, 'a')`,
            funct({_meta:{title:'A'},b:{_meta:{title:'B'},c:{_meta:{title:'C'},d:{_meta:{title:'D'}}}}}, 'a')).toError(
            `${nm}(): 'depth' 4 is > 3`);

    // Invalid schema.
    expect(`${nm}({_meta:{title:'A'},foo:[]}, 'bar')`,
            funct({_meta:{title:'A'},foo:[]}, 'bar')).toError(
            `${nm}(): '(schema) bar.foo' is an array not an object`);
    expect(`${nm}({_meta:{title:'A'},café:{kind:'boolean'}})`,
            funct({_meta:{title:'A'},café:{kind:'boolean'}})).toError(
            `${nm}(): 'key' "café" fails /^[_a-z][_0-9a-z]*$/`);
    expect(`${nm}({_meta:{title:'A'},foo:{kind:'no such kind'}})`,
            funct({_meta:{title:'A'},foo:{kind:'no such kind'}})).toError(
            `${nm}(): '(schema) rl_f.foo.kind' not recognised`);
    expect(`${nm}({sub:{_meta:{title:''},_:{kind:'boolean'}},_meta:{title:'Abc'}})`,
            funct({sub:{_meta:{title:''},_:{kind:'boolean'}},_meta:{title:'Abc'}})).toError(
            `${nm}(): '(schema) rl_f.sub._meta.title' "" fails /^[-_ 0-9a-z...2}$/i`);

    // Basic usage.
    expect(`${nm}({_meta:{title:'Abc'}}, 'a'.repeat(255), 1)`,
            funct({_meta:{title:'Abc'}}, 'a'.repeat(255), 1)).toJson({
                error: undefined,
                steps: [
                    { depth:1, height:1, id:'a'.repeat(255), kind:'fieldsetDown', title:'Abc' },
                    { kind:'fieldsetUp' }
                ]
            });
    expect(`${nm}({a:{kind:'boolean'},_meta:{title:'Abc'}})`,
            funct({a:{kind:'boolean'},_meta:{title:'Abc'}})).toJson({
                steps: [
                    { depth:1, height:2, id:ID_PREFIX, kind:'fieldsetDown', title:'Abc' },
                    { id:ID_PREFIX+'.a', kind:'boolean' },
                    { kind:'fieldsetUp' }
                ]
            });
    expect(`${nm}({sub:{_meta:{title:'Sub'},_:{kind:'boolean'}},outer:{kind:'boolean'},_meta:{title:'Abc'}}, 'id')`,
            funct({sub:{_meta:{title:'Sub'},_:{kind:'boolean'}},outer:{kind:'boolean'},_meta:{title:'Abc'}}, 'id')).toJson({
                steps: [
                    { depth: 1, height: 4, id: 'id', kind: 'fieldsetDown', title: 'Abc', },
                    { depth: 2, height: 2, id: 'id.sub', kind: 'fieldsetDown', title: 'Sub' },
                    { id: 'id.sub._', kind: 'boolean' },
                    { kind: 'fieldsetUp' },
                    { id: 'id.outer', kind: 'boolean' },
                    { kind: 'fieldsetUp' }
                ]
            });

}