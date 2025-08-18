import React, { useEffect, useState } from 'react';

const API_KEY = import.meta.env.VITE_OMDB_API_KEY || '';
const LS_KEY = 'omdb_favorites_v1';

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      console.error('localStorage read error', e);
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('localStorage write error', e);
    }
  }, [key, state]);

  return [state, setState];
}

export default function App() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [favorites, setFavorites] = useLocalStorage(LS_KEY, []);

  useEffect(() => {
    // when selectedId changes, fetch details
    if (!selectedId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${selectedId}&plot=full`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.Response === 'True') {
          setDetails(data);
          setError(null);
        } else {
          setError(data.Error || 'Erro ao carregar detalhes');
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    // fetch search results when query or page changes
    if (!query) {
      setResults([]);
      setTotalResults(0);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.Response === 'True') {
          setResults(data.Search || []);
          setTotalResults(parseInt(data.totalResults || '0', 10));
          setError(null);
        } else {
          setResults([]);
          setTotalResults(0);
          setError(data.Error || 'Nenhum resultado encontrado');
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query, page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setPage(1);
    // effect will fetch
  }

  function toggleFavorite(movie) {
    const exists = favorites.find((f) => f.imdbID === movie.imdbID);
    if (exists) {
      setFavorites(favorites.filter((f) => f.imdbID !== movie.imdbID));
    } else {
      setFavorites([...favorites, movie]);
    }
  }

  function isFavorite(id) {
    return favorites.some((f) => f.imdbID === id);
  }

  const totalPages = Math.ceil(totalResults / 10);

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>OMDb Movie Search</h1>
        <p style={{ margin: '4px 0', fontSize: 13 }}>Busque filmes, veja detalhes e salve favoritos (localStorage)</p>
      </header>

      <main style={styles.main}>
        <section style={styles.left}>
          <form onSubmit={onSearchSubmit} style={styles.searchForm}>
            <input
              aria-label="Search" 
              placeholder="Digite o nome do filme..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.button}>Buscar</button>
          </form>

          {loading && <div style={styles.info}>Carregando...</div>}
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.resultsGrid}>
            {results.map((m) => (
              <MovieCard
                key={m.imdbID}
                movie={m}
                onDetails={() => setSelectedId(m.imdbID)}
                onToggleFav={() => toggleFavorite(m)}
                isFav={isFavorite(m.imdbID)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(p) => setPage(p)}
            />
          )}
        </section>

        <aside style={styles.right}>
          <h3>Favoritos</h3>
          <FavoritesList
            favorites={favorites}
            onRemove={(id) => setFavorites(favorites.filter((f) => f.imdbID !== id))}
            onOpen={(id) => setSelectedId(id)}
          />
        </aside>
      </main>

      {selectedId && (
        <DetailsModal
          details={details}
          loading={loading}
          error={error}
          onClose={() => setSelectedId(null)}
          onToggleFav={() => {
            if (!details) return;
            toggleFavorite({ imdbID: details.imdbID, Title: details.Title, Year: details.Year, Poster: details.Poster, Type: details.Type });
          }}
          isFav={details ? isFavorite(details.imdbID) : false}
        />
      )}
    </div>
  );
}

function MovieCard({ movie, onDetails, onToggleFav, isFav }) {
  return (
    <div style={styles.card}>
      <img
        src={movie.Poster !== 'N/A' ? movie.Poster : placeholderPoster(movie)}
        alt={`${movie.Title} poster`}
        style={styles.poster}
      />
      <div style={styles.cardBody}>
        <div style={{ fontWeight: 700 }}>{movie.Title}</div>
        <div style={{ fontSize: 12 }}>{movie.Year}</div>
        <div style={styles.cardActions}>
          <button onClick={onDetails} style={styles.smallButton}>Detalhes</button>
          <button onClick={onToggleFav} style={styles.smallButton}>{isFav ? 'Remover' : 'Favoritar'}</button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const prev = () => onChange(Math.max(1, page - 1));
  const next = () => onChange(Math.min(totalPages, page + 1));
  return (
    <div style={styles.pagination}>
      <button onClick={prev} disabled={page === 1} style={styles.smallButton}>Anterior</button>
      <div style={{ padding: '0 8px' }}>Página {page} / {totalPages}</div>
      <button onClick={next} disabled={page === totalPages} style={styles.smallButton}>Próxima</button>
    </div>
  );
}

function DetailsModal({ details, loading, error, onClose, onToggleFav, isFav }) {
  return (
    <div style={styles.modalOverlay} role="dialog">
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0 }}>{details ? details.Title : 'Detalhes'}</h2>
          <button onClick={onClose} style={styles.smallButton}>Fechar</button>
        </div>

        {loading && <div style={styles.info}>Carregando detalhes...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {details && (
          <div style={styles.modalBody}>
            <img src={details.Poster !== 'N/A' ? details.Poster : placeholderPoster(details)} alt="poster" style={{ width: 160, marginRight: 12 }} />
            <div>
              <p><strong>Ano:</strong> {details.Year}</p>
              <p><strong>Diretor:</strong> {details.Director}</p>
              <p><strong>Elenco:</strong> {details.Actors}</p>
              <p><strong>Gênero:</strong> {details.Genre}</p>
              <p><strong>Nota IMDB:</strong> {details.imdbRating} ({details.imdbVotes} votos)</p>
              <p><strong>Sinopse:</strong> {details.Plot}</p>

              <div style={{ marginTop: 8 }}>
                <button onClick={onToggleFav} style={styles.button}>{isFav ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FavoritesList({ favorites, onRemove, onOpen }) {
  if (!favorites || favorites.length === 0) return <div style={{ fontSize: 13 }}>Nenhum favorito ainda.</div>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {favorites.map((f) => (
        <li key={f.imdbID} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <img src={f.Poster !== 'N/A' ? f.Poster : placeholderPoster(f)} alt="thumb" style={{ width: 40 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{f.Title}</div>
            <div style={{ fontSize: 12 }}>{f.Year}</div>
          </div>
          <div>
            <button onClick={() => onOpen(f.imdbID)} style={styles.smallButton}>Abrir</button>
            <button onClick={() => onRemove(f.imdbID)} style={styles.smallButton}>Remover</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function placeholderPoster(m) {
  // simple placeholder generated from title initials
  const initials = (m && m.Title) ? m.Title.split(' ').slice(0,2).map(s => s[0]).join('') : 'N/A';
  // return data-uri small SVG
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='330'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='48' fill='%23666'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const styles = {
  app: { fontFamily: 'Inter, Roboto, Arial, sans-serif', padding: 16, maxWidth: 1100, margin: '0 auto' },
  header: { marginBottom: 12 },
  main: { display: 'flex', gap: 16 },
  left: { flex: 1 },
  right: { width: 300, borderLeft: '1px solid #eee', paddingLeft: 12 },
  searchForm: { display: 'flex', gap: 8, marginBottom: 12 },
  input: { flex: 1, padding: '8px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc' },
  button: { padding: '8px 10px', borderRadius: 6, border: 'none', background: '#0b5fff', color: '#fff', cursor: 'pointer' },
  smallButton: { padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', marginLeft: 6 },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  card: { display: 'flex', flexDirection: 'column', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' },
  poster: { width: '100%', height: 300, objectFit: 'cover' },
  cardBody: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  cardActions: { marginTop: 'auto', display: 'flex', justifyContent: 'space-between' },
  pagination: { marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 8, background: '#f0f7ff', borderRadius: 6, marginBottom: 8 },
  error: { padding: 8, background: '#ffecec', color: '#900', borderRadius: 6, marginBottom: 8 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 8, padding: 16, width: 'min(900px, 95%)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalBody: { display: 'flex', gap: 12 },
};
