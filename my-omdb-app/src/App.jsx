import React, { useEffect, useState } from "react";
import "./App.css";

const API_KEY = import.meta.env.VITE_OMDB_API_KEY || "";
const LS_KEY = "omdb_favorites_v1";

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

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useLocalStorage(LS_KEY, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Buscar filmes
  async function searchMovies(page = 1) {
    if (!query) return;
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&s=${query}&page=${page}&language=pt-BR`
    );
    const data = await res.json();
    if (data.Search) {
      setResults(data.Search);
      setTotalResults(parseInt(data.totalResults, 10));
      setPage(page);
    } else {
      setResults([]);
      setTotalResults(0);
    }
  }

  // Detalhes do filme
  async function fetchDetails(id) {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&i=${id}&plot=full&language=pt-BR`
    );
    const data = await res.json();
    setSelected(data);
  }

  // Favoritos
  function toggleFavorite(movie) {
    const exists = favorites.find((f) => f.imdbID === movie.imdbID);
    if (exists) {
      setFavorites(favorites.filter((f) => f.imdbID !== movie.imdbID));
    } else {
      setFavorites([...favorites, movie]);
    }
  }

  const isFav = (id) => favorites.some((f) => f.imdbID === id);

  return (
    <div className="app">
      {/* Header */}
<header>
  <div className="header-left">
    <div className="logo">+Pra Ti Catálogo de Filmes e Séries</div>
    <p>Encontre seus filmes e séries favoritos aqui.</p>
  </div>
  <button
    className="fav-toggle-btn"
    onClick={() => setSidebarOpen(true)}
  >
    ⭐ Favoritos
  </button>
</header>


      {/* Busca */}
      <form
        className="search-form"
        onSubmit={(e) => {
          e.preventDefault();
          searchMovies(1);
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filmes ou séries..."
        />
        <button type="submit">Buscar</button>
      </form>

      {/* Resultados */}
      <main>
        <div className="left">
          <div className="cards-grid">
            {results.map((movie) => (
              <div
                key={movie.imdbID}
                className="card"
                onClick={() => fetchDetails(movie.imdbID)}
              >
                <img
                  src={
                    movie.Poster !== "N/A"
                      ? movie.Poster
                      : "https://via.placeholder.com/160x240?text=Sem+Imagem"
                  }
                  alt={movie.Title}
                />
                <div className="card-body">
                  <div>{movie.Title}</div>
                  <div className="card-year">{movie.Year}</div>
                </div>
                <div className="card-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(movie);
                    }}
                  >
                    {isFav(movie.imdbID) ? "Remover" : "Favoritar"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalResults > 10 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => searchMovies(page - 1)}
              >
                ◀
              </button>
              <span>
                Página {page} de {Math.ceil(totalResults / 10)}
              </span>
              <button
                disabled={page * 10 >= totalResults}
                onClick={() => searchMovies(page + 1)}
              >
                ▶
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalhes */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.Title}</h2>
              <button onClick={() => setSelected(null)}>✖</button>
            </div>
            <div className="modal-body">
              <img
                src={
                  selected.Poster !== "N/A"
                    ? selected.Poster
                    : "https://via.placeholder.com/300x450?text=Sem+Imagem"
                }
                alt={selected.Title}
              />
              <div>
                <p>
                  <strong>Ano:</strong> {selected.Year}
                </p>
                <p>
                  <strong>Gênero:</strong> {selected.Genre}
                </p>
                <p>
                  <strong>Duração:</strong> {selected.Runtime}
                </p>
                <p>{selected.Plot}</p>
                <button
                  className="fav-button"
                  onClick={() => toggleFavorite(selected)}
                >
                  {isFav(selected.imdbID)
                    ? "Remover dos Favoritos"
                    : "Adicionar aos Favoritos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar de Favoritos */}
      <div className={`favorites-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>⭐ Favoritos</h3>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            ✖
          </button>
        </div>
        <ul className="favorites-list">
          {favorites.length === 0 && <p>Nenhum favorito ainda.</p>}
          {favorites.map((fav) => (
            <li key={fav.imdbID}>
              <img
                src={
                  fav.Poster !== "N/A"
                    ? fav.Poster
                    : "https://via.placeholder.com/40x60?text=Sem+Img"
                }
                alt={fav.Title}
              />
              <span>{fav.Title}</span>
              <button onClick={() => toggleFavorite(fav)}>Remover</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}