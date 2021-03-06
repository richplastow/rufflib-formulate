// rufflib-formulate/src/main-test.js
// (compare with rufflib-formulate/main-test.js)

// Entry point for running the unit tests in Formulate’s source files.
// Also used for building Formulate’s unit test distribution files.

import { testBuildRenderInstructions } from './helpers/build-render-instructions.js';
import { testDemo1 } from './docs/demo/demo-1.js';
import { testFormulateBasics } from './formulate.js';

// Run each test. You can comment-out some during development, to help focus on
// individual tests. But make sure all tests are uncommented before committing.
export default function formulateTest(expect, Formulate) {

    // Mock a DOM, for NodeJS.
    if (typeof global === 'object') {
        global.HTMLElement = class HTMLElement {
            addEventListener() { }
            appendChild() { }
            createElement() { return new HTMLElement() }
        };
        HTMLElement.prototype.classList = { add() {} }
        HTMLElement.prototype.style = {}
        global.document = new HTMLElement();
    }

    testFormulateBasics(expect, Formulate);

    testBuildRenderInstructions(expect);
    testDemo1(expect, Formulate);

}
