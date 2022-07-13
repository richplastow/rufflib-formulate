// rufflib-formulate/src/helpers/class-helpers.js


/* --------------------------------- Import --------------------------------- */

import { CSS_PREFIX, ID_PREFIX } from './constants.js';
import { toggleMinimisation, isFieldset } from './dom-helpers.js';


/* -------------------------- Public Class Helpers -------------------------- */

// Transforms a Formulate schema into a list of steps (instructions for
// creating HTML elements).
export function schemaToSteps(schema, path=ID_PREFIX, depth=1) {
    const steps = [];
    const fieldsetDown = {
        kind: 'fieldsetDown',
        title: schema._meta.title,
    };
    fieldsetDown.id = path;
    steps.push(fieldsetDown);
    let height = 1; // in lines
    for (let identifier in schema) {
        const obj = schema[identifier];
        if (typeof obj !== 'object' || obj === null) throw Error('!');
        if (identifier === '_meta') {
            continue;
        } if (obj.kind) {
            if (! /^[_a-z][_a-z0-9]*$/.test(identifier))
                throw Error(`${identifier} fails /^[_a-z][_a-z0-9]`)
            obj.identifier = identifier;
            obj.id = `${path}-${identifier}`;
            steps.push(obj);
            height++;
        } else {
            const [subHeight, subSteps] = schemaToSteps(
                obj, `${path}-${identifier}`, depth+1);
            height += subHeight;
            steps.push(...subSteps);
        }
    }
    fieldsetDown.depth = depth;
    fieldsetDown.height = height;
    steps.push({ kind:'fieldsetUp' });
    return [height, steps];
}

// Creates various elements, based on ‘step’ instructions.
export function render($container, steps) {
    // Reset container content, eg remove the text ‘Loading...’.
    $container.innerHTML = '';

    // Step through each instruction. The last element in `$$containers`
    // is the current container element, so `$$containers.pop()` can be
    // used to go back up a level.
    const $$containers = [ $container ];
    for (let i=0, l=steps.length; i<l; i++) {
        const step = steps[i];
        const $curr = $$containers[$$containers.length-1]; // current container
        switch (step.kind) {
            case 'fieldsetDown':
                const $el = _buildFieldset(step);
                $curr.appendChild($el);
                $$containers.push($el);
                break;
            case 'fieldsetUp':
                $$containers.pop();
                break;
            case 'boolean':
                $curr.appendChild(_buildBoolean(step));
                break;
            default:
                throw Error(`steps[${i}].kind '${step.kind}' not recognised`);
        }
    }

    // Listen for click and drag events. @TODO drag
    $container.addEventListener('click', evt => {
        let $target = evt.target;
        if (! $target.id) $target = $target.parentNode;
        if (! $target.id) $target = $target.parentNode;

        // When a fieldset is clicked, toggle its minimisation.
        if (isFieldset($target)) toggleMinimisation($target);
    });

}


/* -------------------------- Private Class Helpers ------------------------- */

// Creates a <CHECKBOX> wrapped in a <LABEL>, based on a ‘step’ instruction.
function _buildBoolean(step) {
    const $el = document.createElement('label');
    $el.id = step.id;
    $el.classList.add(`${CSS_PREFIX}row`,`${CSS_PREFIX}boolean`);
    const $identifier = document.createElement('span');
    $identifier.innerHTML = step.identifier;
    $el.appendChild($identifier);
    const $input = document.createElement('input');
    $input.type = 'checkbox';
    $input.checked = step.initially;
    $el.appendChild($input);
    return $el;
}

// Creates a <FIELDSET> element, based on a ‘step’ instruction.
function _buildFieldset(step) {
    const $el = document.createElement('fieldset');
    $el.id = step.id;
    $el.classList.add(`${CSS_PREFIX}fieldset`, `${CSS_PREFIX}depth-${step.depth}`);
    $el.style.height = `${step.height*30}px`;
    const $title = document.createElement('div');
    $title.classList.add(`${CSS_PREFIX}title`);
    $el.appendChild($title);
    const $arrow = document.createElement('span');
    $arrow.classList.add(`${CSS_PREFIX}arrow`);
    $arrow.innerText = '➤'; // BLACK RIGHTWARDS ARROWHEAD U+27A4
    $title.appendChild($arrow);
    $title.innerHTML += ` ${step.title}`;
    return $el;
}


/* ---------------------------------- Tests --------------------------------- */

// Tests schemaToSteps(). @TODO
export function testSchemaToSteps(expect, Formulate) {
    expect().section('schemaToSteps()');


}

// Tests render(). @TODO
export function testRender(expect, Formulate) {
    // expect().section('render()');
}