import xs from 'xstream';
import { div, pre, span, input, li, ul } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CountListItem from '../countlistitem';
import { makeCollection } from '@cycle/state';

const defaultState = {
    selected: {
        'uk dub': true,
        rkkk: true
    },
    list: [
        {
            name: 'dub',
            count: 20
        },
        {
            name: 'uk dub',
            count: 29
        },
        {
            name: 'reggae',
            count: 79
        },
        {
            name: 'rkkk',
            count: 1
        }
    ]
};

function CountList(sources) {
    const initReducer$ = xs.of(prevState =>
        prevState === undefined ? defaultState : prevState
    );

    const List = makeCollection({
        item: CountListItem,
        itemKey: (childState, index) => index,
        itemScope: key => key, // use `key` string as the isolation scope
        collectSinks: instances => {
            return {
                DOM: instances
                    .pickCombine('DOM')
                    .map(itemVNodes => ul(itemVNodes)),
                state: instances.pickMerge('state'),
                detailsRequest: instances.pickMerge('detailsRequest')
            };
        }
    });

    const listLens = {
        get: state => {
            return state.list
                .map(item => ({
                    ...item,
                    selected: state.selected[item.name] || false
                }))
                .sort((a, b) => {
                    if (state.selected[a.name] && !state.selected[b.name])
                        return -1;
                    if (!state.selected[a.name] && state.selected[b.name])
                        return 1;
                    if (state.selected[a.name] == state.selected[b.name])
                        return b.count - a.count;
                });
        },
        set: (state, childState) => ({
            ...state,
            list: [...childState],
            selected: childState.reduce((acc, v) => {
                if (v.selected) acc[v.name] = true;
                else delete acc[v.name];

                return acc;
            }, state.selected)
        })
    };

    const listSinks = isolate(List, { state: listLens })(sources);

    // sources.state.stream.subscribe({ next: sourcesStateStream => console.log({ sourcesStateStream }) })
    // listSinks.detailsRequest.subscribe({ next: detailsRequest => console.log('list', { detailsRequest }) })

    const vdom$ = xs
        .combine(sources.state.stream, listSinks.DOM)
        .map(([state, listDOM]) =>
            div([
                // pre(JSON.stringify(state.selected, null, 2)),
                listDOM
            ])
        );

    return {
        DOM: vdom$,
        state: xs.merge(initReducer$, listSinks.state),
        detailsRequest: listSinks.detailsRequest
    };
}

export default CountList;
