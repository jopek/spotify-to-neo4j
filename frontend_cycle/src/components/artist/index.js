import xs from 'xstream';
import { div, h3, p } from '@cycle/dom';
import isolate from '@cycle/isolate';
import Collaborators from './artistcollaborators';
import ArtistGenres from './artistgenres';

const defaultState = {
    genres: {
        selected: { genre1: true },
        list: [{ name: 'genre1' }, { name: 'genre2' }]
    },
    collaborators: [
        { name: 'collab1', id: 'id1' },
        { name: 'collab2', id: 'id2' },
        { name: 'collab3', id: 'id3' }
    ],
    artist: { name: 'artist name', id: 'ididid' }
};

const intent = ({ DOM }) => ({});

const model = intent => {
    const initReducer$ = xs.of(prevState =>
        !prevState ? defaultState : prevState
    );

    return xs.merge(initReducer$);
};

const view = (state$, collabsDOM$, genresDOM$) =>
    xs
        .combine(state$, collabsDOM$, genresDOM$)
        .map(([state, coll, genres]) =>
            div([h3(state.artist.name), coll, p(), genres])
        );

const genreLens = {
    get: state => {
        console.log('GENRE LENS', state.genres);
        // return state.genres
        return state.genres.list
            .sort((a, b) => (a.name < b.name ? -1 : 1))
            .map(g => ({
                name: g.name,
                selected: !!state.genres.selected[g.name]
            }));
    },
    set: (state, itemState) => {
        return {
            ...state,
            genres: {
                ...state.genres,
                selected: itemState.reduce((acc, v) => {
                    if (v.selected) acc[v.name] = v;
                    else delete acc[v.name];
                    return acc;
                }, state.genres.selected)
            }
        };
    }
};

const Artist = sources => {
    const collabsSink = isolate(Collaborators, 'collaborators')(sources);
    const genresSink = isolate(ArtistGenres, { state: genreLens })(sources);
    // const genresSink = isolate(ArtistGenres, { state: 'genres' })(sources);

    const state$ = sources.state.stream;
    state$.subscribe({ next: state => console.log({ 'artist state': state }) });

    const action = intent(sources);
    const reducer$ = model(action);
    const vdom$ = view(state$, collabsSink.DOM, genresSink.DOM);

    return {
        DOM: vdom$,
        state: xs.merge(reducer$, collabsSink.state, genresSink.state),
        detailsRequest: collabsSink.detailsRequest
    };
};

export default Artist;
