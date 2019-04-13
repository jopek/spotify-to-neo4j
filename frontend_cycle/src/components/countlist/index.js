import xs from 'xstream';
import { div, pre, span, input, li, ul } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CountListItem from '../countlistitem';
import { makeCollection } from '@cycle/state';
import debounce from 'xstream/extra/debounce';

const defaultState = {
    selected: {},
    filter: '',
    list: []
};

const intent = ({ DOM }) => ({
    selectNone$: DOM.select('.selectnone')
        .events('click')
        .mapTo(null),
    selectAll$: DOM.select('.selectall')
        .events('click')
        .mapTo(null),
    filterList$: DOM.select('.listfilter')
        .events('input')
        .compose(debounce(100))
        .map(e => e.target.value)
});

const model = keyFn => (intent, { state: listReducer$ }) => {
    const initReducer$ = xs.of(prevState =>
        prevState === undefined ? defaultState : prevState
    );

    const selectAllReducer$ = intent.selectAll$.mapTo(prevState => ({
        ...prevState,
        selected: prevState.list.reduce((acc, v) => {
            acc[keyFn(v)] = true;
            return acc;
        }, prevState.selected)
    }));

    const selectNoneReducer$ = intent.selectNone$.mapTo(prevState => {
        return {
            ...prevState,
            selected: prevState.list.reduce((acc, v) => {
                delete acc[keyFn(v)];
                return acc;
            }, prevState.selected)
        };
    });

    const listFilterReducer$ = intent.filterList$.map(input => prevState => {
        console.log({ input, prevState });
        return {
            ...prevState,
            filter: input
        };
    });

    return xs.merge(
        initReducer$,
        selectAllReducer$,
        selectNoneReducer$,
        listFilterReducer$,
        listReducer$
    );
};

const CountList = keyFn => sources => {
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
                    selected: state.selected[keyFn(item)] || false
                }))
                .sort((a, b) =>
                    a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
                );
        },
        set: (state, childState) => {
            return {
                ...state,
                selected: childState.reduce((acc, v) => {
                    if (v.selected) acc[keyFn(v)] = true;
                    else delete acc[keyFn(v)];
                    return acc;
                }, state.selected)
            };
        }
    };

    const listSinks = isolate(List, { state: listLens })(sources);

    sources.state.stream.subscribe({
        next: sourcesStateStream =>
            console.log('countlist state', sourcesStateStream)
    });
    // listSinks.detailsRequest.subscribe({ next: detailsRequest => console.log('list', { detailsRequest }) })

    const action$ = intent(sources);
    const reducer$ = model(keyFn)(action$, listSinks);

    const vdom$ = xs
        .combine(sources.state.stream, listSinks.DOM)
        .map(([state, listDOM]) =>
            div('.clearfix', [
                // pre(JSON.stringify(state.selected, null, 2)),
                div('.clearfix .countlistfilter', [
                    ul('.listselection', [
                        li('.listitem .selectall', ['all']),
                        li('.listitem .selectnone', ['none'])
                    ]),
                    input('.listfilter', {
                        attrs: {
                            placeholder: 'find in list...'
                        }
                    })
                ]),
                listDOM
            ])
        );

    return {
        DOM: vdom$,
        state: reducer$,
        detailsRequest: listSinks.detailsRequest
    };
};

export default CountList;
