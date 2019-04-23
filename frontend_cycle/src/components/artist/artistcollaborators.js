import xs from 'xstream';
import { ul, li, span } from '@cycle/dom';
import { makeCollection } from '@cycle/state';
import sampleCombine from 'xstream/extra/sampleCombine';

const defaultItemState = {
    name: 'collaborator',
    id: 'collaboratorId'
};

export const CollaboratorItem = sources => {
    const state$ = sources.state.stream;
    const vdom$ = state$.map(s => li('.artist', [s.name]));
    const reducer$ = xs.merge(
        xs.of(state => (!state ? defaultItemState : state))
    );

    const artistDetailsRequest$ = sources.DOM.select('.artist')
        .events('click')
        .debug()
        .compose(sampleCombine(state$))
        .map(([c, s]) => s);

    state$.subscribe({
        next: x => console.log({ 'collab item state': x })
    });

    return {
        DOM: vdom$,
        state: reducer$,
        detailsRequest: artistDetailsRequest$
    };
};

export default makeCollection({
    item: CollaboratorItem,
    itemKey: (childState, index) => index,
    itemScope: key => key, // use `key` string as the isolation scope
    collectSinks: instances => {
        return {
            DOM: instances.pickCombine('DOM').map(itemVNodes => ul(itemVNodes)),
            state: instances.pickMerge('state'),
            detailsRequest: instances.pickMerge('detailsRequest')
        };
    }
});
