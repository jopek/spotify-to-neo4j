import xs from 'xstream';
import { table, tr, td, div } from '@cycle/dom';
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
            artist: { name: 'Pye Corner Audio', id: '3ib3ECT421EXd8CNLfNqAL' },
            track: {
                name: 'Mainframe',
                track_number: 2,
                id: '2uzrqj79NJ5QgSUzVo7ML6',
                uri: 'spotify:track:2uzrqj79NJ5QgSUzVo7ML6',
                preview_url:
                    'https://p.scdn.co/mp3-preview/c6fc1e0828b808ec8f57f2f76999c538bb4fddb5?cid=774b29d4f13844c495f206cafdad9c86'
            },
            playlist: { name: 'Cosmic Chill', id: '3iRJ5ibkgFmKOE37EQOJMg' }
        },
        {
            artist: { name: 'Suuns', id: '3UkN1XeK2D4wD4uhtJx4vb' },
            track: {
                name: 'Instrument',
                track_number: 2,
                id: '0Lv8ttBdPjhVTNytcrcumd',
                uri: 'spotify:track:0Lv8ttBdPjhVTNytcrcumd',
                preview_url:
                    'https://p.scdn.co/mp3-preview/246c5534aec0014b774fa41c1b21abb6c819ea02?cid=774b29d4f13844c495f206cafdad9c86'
            },
            playlist: { name: 'Cosmic Chill', id: '3iRJ5ibkgFmKOE37EQOJMg' }
        },
        {
            artist: { name: 'The Field', id: '23MIhFHpoOuhtEHZDrrnCS' },
            track: {
                name: "They Won't See Me",
                track_number: 1,
                id: '6g1B9a8BqGCJ7psysJX073',
                uri: 'spotify:track:6g1B9a8BqGCJ7psysJX073',
                preview_url:
                    'https://p.scdn.co/mp3-preview/43ccc7ba5bbddad3b091b482d973ef068372452a?cid=774b29d4f13844c495f206cafdad9c86'
            },
            playlist: { name: 'Cosmic Chill', id: '3iRJ5ibkgFmKOE37EQOJMg' }
        },
        {
            artist: {
                name: 'Thievery Corporation',
                id: '25KNo5GDS6ZpLkjasaecA3'
            },
            track: {
                name: 'The Temple of I & I',
                track_number: 6,
                id: '113GeSf0XSbFZfyDRNrqWp',
                uri: 'spotify:track:113GeSf0XSbFZfyDRNrqWp',
                preview_url:
                    'https://p.scdn.co/mp3-preview/0f650534eb99a8209809782111154c82ec146ff1?cid=774b29d4f13844c495f206cafdad9c86'
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
    clickArtist$: DOM.select('.artist')
        .events('click')
        .debug()
});

const model = intent => {
    const initReducer$ = xs.of(prevState =>
        prevState === undefined ? defaultState : prevState
    );

    const c = intent.clickArtist$.map(e => state => state);

    return xs.merge(initReducer$, c);
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
                    .map(itemVNodes => table(itemVNodes)),
                state: instances.pickMerge('state'),
                detailsRequest: instances.pickMerge('detailsRequest')
            };
        }
    });

    const tracksTable = isolate(tracksCollection, { state: 'list' })(sources);

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

    xs.merge(state$, artistClick$, artistDetailsRequest$).subscribe({
        next: x => x
    });

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
