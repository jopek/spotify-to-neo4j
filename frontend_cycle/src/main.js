import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHTTPDriver } from '@cycle/http';
import { withState } from '@cycle/state';
// import BmiCalculator from './BmiCalculator';
import cli from './components/countlistitem';
import cl from './components/countlist';
import app from './components/app';

const main = withState(app);
// const main = withState(cl);

// console.log(main)
// main.detailsRequest.subscribe({next: x=>console.log(x)})

run(main, {
    DOM: makeDOMDriver('#main-container'),
    HTTP: makeHTTPDriver()
});
