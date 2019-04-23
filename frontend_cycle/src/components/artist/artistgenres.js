import xs from 'xstream';
import { ul, li, span } from '@cycle/dom';
import { makeCollection } from '@cycle/state';
import sampleCombine from 'xstream/extra/sampleCombine';

const defaultState = { name: 'dub' };

const GenreItem = sources => {
    const state$ = sources.state.stream;
    state$.subscribe({
        next: x => console.log({ 'genre item state': x })
    });

    const vdom$ = state$.map(s =>
        li(`.listitem ${s.selected && '.selected'}`, [s.name])
    );
    const reducer$ = xs.merge(
        xs.of(state => (!state ? defaultState : state)),
        sources.DOM.select('.listitem')
            .events('click')
            .mapTo(state => ({ ...state, selected: !state.selected }))
    );

    return {
        DOM: vdom$,
        state: reducer$,
        detailsRequest: sources.DOM.select('.genre')
            .events('click')
            .compose(sampleCombine(state$))
            .map(([c, s]) => s)
    };
};

export default makeCollection({
    item: GenreItem,
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
