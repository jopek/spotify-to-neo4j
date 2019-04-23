import xs from 'xstream';
import { div, pre, p } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { makeCollection } from '@cycle/state';

const defaultState = {
    0: ['a', 'b', 'c', 'd'],
    1: ['e', 'f', 'g'],
    2: ['h'],
    sel: 0
};

const Item = sources => {
    const state$ = sources.state.stream;
    const intent = sources.DOM.select('.item').events('click');
    const vdom$ = state$.map(s => div('.item', [s]));
    const reducer$ = xs.merge(
        xs.of(state => (!state ? defaultState : state)),
        intent.mapTo(state => state + 'y')
    );
    state$.subscribe({ next: s => console.log('item', s) });
    return {
        DOM: vdom$,
        state: reducer$
    };
};

export default sources => {
    const state$ = sources.state.stream;
    const intents = sources.DOM.select('.toggleSelector').events('click');

    const sinks = isolate(
        makeCollection({
            item: Item,
            itemKey: (childState, index) => index,
            itemScope: key => key, // use `key` string as the isolation scope
            collectSinks: instances => {
                return {
                    DOM: instances
                        .pickCombine('DOM')
                        .map(itemVNodes => div('.group', itemVNodes)),
                    state: instances.pickMerge('state')
                };
            }
        }),
        {
            state: {
                get: s => s[s.sel],
                set: (s, c) => ({ ...s, [s.sel]: c })
            }
        }
    )(sources);

    const vdom$ = xs
        .combine(state$, sinks.DOM)
        .map(([state, snkVD]) =>
            div([
                pre(JSON.stringify(state)),
                p('.toggleSelector', ['TOGGLE']),
                snkVD
            ])
        );

    const reducer$ = xs.merge(
        xs.of(state => (!state ? defaultState : state)),
        intents.mapTo(state => ({ ...state, sel: (state.sel + 1) % 3 })),
        sinks.state
    );

    return {
        DOM: vdom$,
        state: reducer$
    };
};
