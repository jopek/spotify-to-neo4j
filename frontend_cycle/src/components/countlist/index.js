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

const filterFn = state => item =>
    state.filter.length == 0 ||
    item.name.toLowerCase().indexOf(state.filter.toLowerCase()) > -1;

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

const model = keyFn => (
    intent,
    { state: listReducer$ },
    { state: selectedListReducer$ }
) => {
    const initReducer$ = xs.of(prevState =>
        prevState === undefined ? defaultState : prevState
    );

    const selectAllReducer$ = intent.selectAll$.mapTo(prevState => ({
        ...prevState,
        selected: prevState.list
            .filter(filterFn(prevState))
            .reduce((acc, v) => {
                acc[keyFn(v)] = v;
                return acc;
            }, prevState.selected)
    }));

    const selectNoneReducer$ = intent.selectNone$.mapTo(prevState => {
        return {
            ...prevState,
            selected: prevState.list
                .filter(filterFn(prevState))
                .reduce((acc, v) => {
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
        listReducer$,
        selectedListReducer$
    );
};

const CountList = ({
    keyFn = i => i.name,
    renderAllSelections = true
}) => sources => {
    const List = makeCollection({
        item: CountListItem,
        itemKey: (childState, index) => index,
        itemScope: key => key, // use `key` string as the isolation scope
        collectSinks: instances => {
            return {
                DOM: instances
                    .pickCombine('DOM')
                    .map(itemVNodes => ul('.listselection', itemVNodes)),
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
                    selected: state.selected[keyFn(item)] !== undefined
                }))
                .filter(filterFn(state))
                .sort((a, b) =>
                    a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
                );
        },
        set: (state, itemStates) => {
            return {
                ...state,
                selected: itemStates.reduce((acc, v) => {
                    if (v.selected) acc[keyFn(v)] = v;
                    else delete acc[keyFn(v)];
                    return acc;
                }, state.selected)
            };
        }
    };
    const listSinks = isolate(List, { state: listLens })(sources);

    const selectedListLens = {
        get: state =>
            Object.keys(state.selected)
                .map(k => state.selected[k])
                .map(item => ({ ...item, selected: true }))
                .sort((a, b) =>
                    a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
                ),
        set: (state, itemStates) => {
            return {
                ...state,
                selected: itemStates.reduce((acc, v) => {
                    if (!v.selected) delete acc[keyFn(v)];
                    return acc;
                }, state.selected)
            };
        }
    };
    const selectedListSinks = isolate(List, { state: selectedListLens })(
        sources
    );

    // sources.state.stream.subscribe({
    //     next: sourcesStateStream =>
    //         console.log('countlist state', sourcesStateStream)
    // });
    // listSinks.detailsRequest.subscribe({ next: detailsRequest => console.log('list', { detailsRequest }) })

    const action$ = intent(sources);
    const reducer$ = model(keyFn)(action$, listSinks, selectedListSinks);

    const vdom$ = xs
        .combine(sources.state.stream, listSinks.DOM, selectedListSinks.DOM)
        .map(([state, listDOM, selectedDOM]) =>
            div('.clearfix', [
                renderAllSelections && Object.keys(state.selected).length > 0
                    ? div('.clearfix .countlistfilter', [selectedDOM])
                    : null,

                div('.clearfix .countlistfilter', [
                    ul('.listselection', [
                        li('.listitem .selectall', ['all']),
                        li('.listitem .selectnone', ['none'])
                    ]),

                    input('.listfilter', {
                        attrs: {
                            placeholder: 'find in list...',
                            value: state.filter
                        }
                    }),
                    listDOM
                ])
            ])
        );

    return {
        DOM: vdom$,
        state: reducer$,
        detailsRequest: xs.merge(
            listSinks.detailsRequest,
            selectedListSinks.detailsRequest
        )
    };
};

export default CountList;
