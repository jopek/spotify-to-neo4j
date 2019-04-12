import xs from 'xstream';
import { div, span, pre, li, h1, h2, h3 } from '@cycle/dom';
import isolate from '@cycle/isolate';
import CountList from '../countlist';

const defaultState = {
    selectedGenres: {
        b: true,
        c: true
    },
    genres: [
        {
            name: 'dub',
            count: 203
        },
        {
            name: 'b',
            count: 29
        },
        {
            name: 'c',
            count: 79
        }
    ],
    relatedGenres: {
        reference: null,
        genres: []
    },
    playlists: [],
    selectedPlaylists: {}
};

function intent({ DOM, HTTP }) {
    return {
        playlists$: HTTP.select('pl')
            .flatten()
            .map(res => res.body),
        relgen$: HTTP.select('relgen')
            .flatten()
            .map(res => res.body),
        // .debug()
        gen$: HTTP.select('gen')
            .flatten()
            .map(res => res.body)
        // .debug()
    };
}

function model(intents, detailsRequest$) {
    const defaultReducer$ = xs.of(prevState =>
        typeof prevState === 'undefined' ? defaultState : prevState
    );

    const savePlaylistsResponseReducer$ = intents.playlists$.map(
        response => prevState => ({
            ...prevState,
            playlists: [...response]
        })
    );

    const saveRelGenResponseReducer$ = intents.relgen$.map(
        response => prevState => ({
            ...prevState,
            relatedGenres: {
                ...prevState.relatedGenres,
                genres: response.map(genre => ({ ...genre, name: genre.genre }))
            }
        })
    );

    const saveReferenceGenreReducer$ = detailsRequest$.map(
        reference => prevState => ({
            ...prevState,
            relatedGenres: { ...prevState.relatedGenres, reference }
        })
    );

    const saveGenResponseReducer$ = intents.gen$.map(response => prevState => ({
        ...prevState,
        genres: response.map(genre => ({ ...genre, name: genre.genre }))
    }));

    return xs.merge(
        defaultReducer$,
        saveGenResponseReducer$,
        saveRelGenResponseReducer$,
        saveReferenceGenreReducer$,
        savePlaylistsResponseReducer$
    );
}

function view(genresDOM$, relatedGenresDOM$, playlistsDOM$, state$) {
    return xs
        .combine(genresDOM$, relatedGenresDOM$, playlistsDOM$, state$)
        .map(([g, rg, pl, s]) =>
            div('.grid', [
                pre(
                    '.debug',
                    Object.keys(s.selectedPlaylists).map(i => `${i}\n`)
                ),
                div('.pl', [h3('playlists'), pl]),
                div('.gen', [h3('genres'), g]),
                s.relatedGenres.reference === null
                    ? null
                    : div('.relgen', [
                          h3(`related genres to ${s.relatedGenres.reference}`),
                          rg
                          // pre(JSON.stringify(s.relatedGenres, null, 2))
                      ])
            ])
        );
}

export default function App(sources) {
    const state$ = sources.state.stream;

    const genresLens = {
        get: state => ({
            list: [...state.genres],
            selected: state.selectedGenres
        }),
        set: (state, genreState) => ({
            ...state,
            selectedGenres: genreState.selected
        })
    };
    const genres = isolate(CountList, { state: genresLens })(sources);

    const playlistsLens = {
        get: state => ({
            list: [...state.playlists],
            selected: state.selectedPlaylists
        }),
        set: (state, playlistsState) => ({
            ...state,
            selectedPlaylists: playlistsState.selected
        })
    };
    const playlists = isolate(CountList, { state: playlistsLens })(sources);

    const relatedGenresLens = {
        get: state => ({
            list: [...state.relatedGenres.genres],
            selected: state.selectedGenres,
            reference: state.reference
        }),
        set: (state, genreState) => ({
            ...state,
            relatedGenres: {
                ...state.relatedGenres,
                genres: [...genreState.list]
            }
        })
    };
    const relatedGenres = isolate(CountList, { state: relatedGenresLens })(
        sources
    );

    const vdom$ = view(genres.DOM, relatedGenres.DOM, playlists.DOM, state$);

    const playlistsRequest$ = xs
        .of({
            url: `/api/playlists`,
            headers: { 'content-type': 'application/json' },
            category: 'pl'
        })
        .debug();

    const genresRequest$ = xs
        .of({
            url: `/api/genres`,
            headers: { 'content-type': 'application/json' },
            category: 'gen'
        })
        .debug();

    const detailsRequest$ = xs.merge(
        genres.detailsRequest,
        relatedGenres.detailsRequest
    );
    const relatedGenresRequest$ = detailsRequest$
        .map(genre => ({
            url: `/api/genre/${genre}/related`,
            headers: { 'content-type': 'application/json' },
            category: 'relgen'
        }))
        .debug();

    const actions = intent(sources);
    const localReducer$ = model(actions, detailsRequest$);
    const reducer$ = xs.merge(
        localReducer$,
        genres.state,
        relatedGenres.state,
        playlists.state
    );

    const request$ = xs.merge(
        genresRequest$,
        relatedGenresRequest$,
        playlistsRequest$
    );

    // state$.subscribe({ next: state => console.log({ state }) })

    return {
        DOM: vdom$,
        state: reducer$,
        HTTP: request$
    };
}
