
import React, { useEffect, useState } from 'react';
import './App.css';

const API_KEY = import.meta.env.VITE_OMDB_API_KEY || '';
const LS_KEY = 'omdb_favorites_v1';

// Hook para localStorage
function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState];
}

// Função de tradução
async function traduzirTexto(texto) {
  if (!texto) return '';
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      body: JSON.stringify({ q: texto, source: 'en', target: 'pt' }),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Falha na tradução');
    const data = await res.json();
    return data.translatedText;
  } catch (err) {
    console.error('Erro ao traduzir:', err);
    return texto;
  }
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
  const [dark, setDark] = useState(true);

  const toggleTheme = () => setDark(!dark);

  // Fetch detalhes do filme selecionado
  useEffect(() => {
    if (!selectedId) return setDetails(null);
    let cancelled = false;
    setLoading(true);
    fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&i=${selectedId}&plot=full`)
      .then(r => r.json())
      .then(data => { if (!cancelled) data.Response === 'True' ? setDetails(data) : setError(data.Error); })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Fetch resultados de busca
  useEffect(() => {
    if (!query) return setResults([]), setTotalResults(0), setError(null);
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=${page}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          if (data.Response === 'True') {
            setResults(data.Search || []);
            setTotalResults(parseInt(data.totalResults || '0', 10));
            setError(null);
          } else {
            setResults([]);
            setTotalResults(0);
            setError(data.Error || 'Nenhum resultado encontrado');
          }
        }
      })
      .catch(err => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) });
    return () => { cancelled = true; };
  }, [query, page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setPage(1);
  }

  function toggleFavorite(movie) {
    const exists = favorites.find(f => f.imdbID === movie.imdbID);
    if (exists) setFavorites(favorites.filter(f => f.imdbID !== movie.imdbID));
    else setFavorites([...favorites, movie]);
  }

  function isFavorite(id) {
    return favorites.some(f => f.imdbID === id);
  }

  const totalPages = Math.ceil(totalResults / 10);

  return (
    <div className={`app ${dark ? 'dark' : 'light'}`}>
      <div className="theme-toggle">
        <button onClick={toggleTheme}>{dark ? '☀️ Tema Claro' : '🌙 Tema Escuro'}</button>
      </div>

      <header>
        <div className="logo">Catalágo +Pra Ti</div>
        <p>Busque filmes, veja detalhes e salve favoritos (localStorage)</p>
      </header>

      <main>
        <section className="left">
          <form className="search-form" onSubmit={onSearchSubmit}>
            <input placeholder="Digite o nome do filme..." value={query} onChange={e => setQuery(e.target.value)} />
            <button type="submit">Buscar</button>
          </form>

          {loading && <div className="info">Carregando...</div>}
          {error && <div className="error">{error}</div>}

          <div className="cards-grid">
            {results.map(m => (
              <MovieCard
                key={m.imdbID}
                movie={m}
                onDetails={() => setSelectedId(m.imdbID)}
                onToggleFav={() => toggleFavorite(m)}
                isFav={isFavorite(m.imdbID)}
              />
            ))}
          </div>

          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
        </section>

        <aside className="right">
          <h3>Favoritos</h3>
          <FavoritesList
            favorites={favorites}
            onRemove={id => setFavorites(favorites.filter(f => f.imdbID !== id))}
            onOpen={id => setSelectedId(id)}
          />
        </aside>
      </main>

      {selectedId && details && (
        <DetailsModal
          details={details}
          loading={loading}
          error={error}
          onClose={() => setSelectedId(null)}
          onToggleFav={() => toggleFavorite({
            imdbID: details.imdbID,
            Title: details.Title,
            Year: details.Year,
            Poster: details.Poster,
            Type: details.Type
          })}
          isFav={isFavorite(details.imdbID)}
        />
      )}
    </div>
  );
}

// Components

function MovieCard({ movie, onDetails, onToggleFav, isFav }) {
  return (
    <div className="card">
      <img src={movie.Poster !== 'N/A' ? movie.Poster : placeholderPoster(movie)} alt={`${movie.Title} poster`} />
      <div className="card-body">
        <div className="card-title">{movie.Title}</div>
        <div className="card-year">{movie.Year}</div>
        <div className="card-actions">
          <button onClick={onDetails}>Detalhes</button>
          <button onClick={onToggleFav}>{isFav ? 'Remover' : 'Favoritar'}</button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }) {
  return (
    <div className="pagination">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>Anterior</button>
      <span>Página {page} / {totalPages}</span>
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Próxima</button>
    </div>
  );
}

function DetailsModal({ details, loading, error, onClose, onToggleFav, isFav }) {
  return (
    <div className="modal-overlay" role="dialog">
      <div className="modal">
        <div className="modal-header">
          <h2>{details.Title}</h2>
          <button onClick={onClose}>Fechar</button>
        </div>

        {loading && <div className="info">Carregando detalhes...</div>}
        {error && <div className="error">{error}</div>}

        <div className="modal-body">
          <img src={details.Poster !== 'N/A' ? details.Poster : placeholderPoster(details)} alt="poster" />
          <div>
            <p><strong>Ano:</strong> {details.Year}</p>
            <p><strong>Diretor:</strong> {details.Director}</p>
            <p><strong>Elenco:</strong> {details.Actors}</p>
            <p><strong>Gênero:</strong> {details.Genre}</p>
            <p><strong>Nota IMDB:</strong> {details.imdbRating} ({details.imdbVotes} votos)</p>
            <p><strong>Sinopse:</strong> {details.Plot}</p>
            <div style={{ marginTop: 8 }}>
              <button className="fav-button" onClick={onToggleFav}>
                {isFav ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function FavoritesList({ favorites, onRemove, onOpen }) {
  if (!favorites || favorites.length === 0) return <div style={{ fontSize: 13 }}>Nenhum favorito ainda.</div>;
  return (
    <ul className="favorites-list">
      {favorites.map(f => (
        <li key={f.imdbID}>
          <img src={f.Poster !== 'N/A' ? f.Poster : placeholderPoster(f)} alt="thumb" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{f.Title}</div>
            <div style={{ fontSize: 12 }}>{f.Year}</div>
          </div>
          <div>
            <button onClick={() => onOpen(f.imdbID)}>Abrir</button>
            <button onClick={() => onRemove(f.imdbID)}>Remover</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function placeholderPoster(m) {
  const initials = m?.Title ? m.Title.split(' ').slice(0, 2).map(s => s[0]).join('') : 'N/A';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='330'>
    <rect width='100%' height='100%' fill='%23333'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
      font-family='Arial' font-size='48' fill='%23fff'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
