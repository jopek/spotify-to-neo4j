import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';
import List from './List';

const main = List;

run(main, {
    DOM: makeDOMDriver('#main-container'),
    HTTP: makeHTTPDriver()
});
