import xs from 'xstream';
import { div, span, input, li } from '@cycle/dom';
import sampleCombine from 'xstream/extra/sampleCombine';

const defaultState = {
    selected: false,
    name: 'aasdasdasd',
    count: 20
};

function intent(domSource) {
    return {
        select$: domSource
            .select('.listitem')
            .events('click')
            .mapTo(null),
        countClicked$: domSource
            .select('.count')
            .events('click')
            .map(e => e.stopPropagation())
            .mapTo(null)
    };
}

function model(intents) {
    const defaultReducer$ = xs.of(prevState =>
        typeof prevState === 'undefined' ? defaultState : prevState
    );

    const selectReducer$ = intents.select$.mapTo(prevState => ({
        ...prevState,
        selected: !prevState.selected
    }));

    return xs.merge(defaultReducer$, selectReducer$);
}

function view(state$) {
    return state$.map(state => {
        return li(`.listitem ${(state.selected && '.selected') || ''}`, [
            span('.content', [state.name]),
            span('.count', ['(', state.count, ')'])
        ]);
    });
}

function ListItem(sources) {
    const actions = intent(sources.DOM);
    const reducer$ = model(actions);
    const vdom$ = view(sources.state.stream);

    const detailsRequest$ = actions.countClicked$
        .compose(sampleCombine(sources.state.stream))
        .map(([c, s]) => s.name);

    return {
        DOM: vdom$,
        state: reducer$,
        detailsRequest: detailsRequest$
    };
}

export default ListItem;
