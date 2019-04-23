import xs from 'xstream';
import { table, thead, tbody, tr, td, div } from '@cycle/dom';
import { makeCollection } from '@cycle/state';
import isolate from '@cycle/isolate';
import sampleCombine from 'xstream/extra/sampleCombine';

const defaultState = {
    list: [
        {
            artist: { name: 'Pye Corner Audio', id: '3ib3ECT421EXd8CNLfNqAL' },
            track: {
                name: 'Lost Ways',
                track_number: 2,
                id: '2UDiGK9mvNpWK0wRSqrDiL',
                uri: 'spotify:track:2UDiGK9mvNpWK0wRSqrDiL',
                preview_url:
                    'https://p.scdn.co/mp3-preview/db3fd99a53c61ecab78532930ac338dfb5089ed9?cid=774b29d4f13844c495f206cafdad9c86'
            },
            playlist: { name: 'Cosmic Chill', id: '3iRJ5ibkgFmKOE37EQOJMg' }
        },
        {
            artist: { name: 'Tosca', id: '0TYvluyvV1Es8lTHiBfnAn' },
            track: {
                name: 'Supersunday - Megablast Remix',
                track_number: 6,
                id: '766Qw2T1KAYK0yVsmdVgLo',
                uri: 'spotify:track:766Qw2T1KAYK0yVsmdVgLo',
                preview_url:
                    'https://p.scdn.co/mp3-preview/ffab013dae9ef48bdda1d29226602892f8b8284a?cid=774b29d4f13844c495f206cafdad9c86'
            },
            playlist: { name: 'Cosmic Chill', id: '3iRJ5ibkgFmKOE37EQOJMg' }
        }
    ]
};

const intent = ({ DOM }) => ({
    clickArtist$: DOM.select('.artist').events('click')
});

const model = intent => {
    const initReducer$ = xs.of(prevState =>
        prevState === undefined ? defaultState : prevState
    );

    return xs.merge(initReducer$);
};

const Tracks = sources => {
    const action = intent(sources);
    const reducer$ = model(action);

    const tracksCollection = makeCollection({
        item: TrackItem,
        itemKey: (childState, index) => index,
        itemScope: key => key, // use `key` string as the isolation scope
        collectSinks: instances => {
            return {
                DOM: instances
                    .pickCombine('DOM')
                    .map(itemVNodes =>
                        table([
                            thead(
                                tr([td('artist'), td('title'), td('playlist')])
                            ),
                            tbody(itemVNodes)
                        ])
                    ),
                state: instances.pickMerge('state'),
                detailsRequest: instances.pickMerge('detailsRequest')
            };
        }
    });

    const tracksTable = isolate(tracksCollection, 'list')(sources);

    tracksTable.detailsRequest.debug();

    return {
        DOM: tracksTable.DOM,
        state: xs.merge(reducer$, tracksTable.state),
        detailsRequest: tracksTable.detailsRequest
    };
};

export default Tracks;

const TrackItem = sources => {
    const reducer$ = xs.merge(
        xs.of(state => (state === undefined ? tiDefaultState : state))
    );

    const state$ = sources.state.stream;

    const artistClick$ = sources.DOM.select('.artist').events('click');

    const artistDetailsRequest$ = artistClick$
        .compose(sampleCombine(state$))
        .map(([c, s]) => s)
        .map(s => s.artist);

    // xs.merge(state$, artistClick$, artistDetailsRequest$).subscribe({
    //     next: x => x
    // });

    const vdom$ = state$.map(t =>
        tr([
            td('.artist', [t.artist.name]),
            td([t.track.name]),
            td([t.playlist.name])
        ])
    );

    return {
        DOM: vdom$,
        state: reducer$,
        detailsRequest: artistDetailsRequest$
    };
};
