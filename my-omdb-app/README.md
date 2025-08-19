Funcionalidades
Busca de filmes: campo de texto e lista de resultados com pôster, título e ano.
Paginação: navegar entre páginas de resultados.
Detalhes do filme: diretor, elenco, sinopse e avaliação.
Favoritos: adicionar/remover filmes, persistindo em localStorage.
Loading & Erros: indicador de carregamento e mensagens de erro.

Pré-requisitos
Node.js instalado
Chave da API do OMDb ou TMDB
Instalação
Clone o repositório:
git clone <URL_DO_REPOSITORIO>
cd nome-do-projeto
Instale as dependências:
npm install
Crie o arquivo .env na raiz do projeto com sua chave da API:
VITE_OMDB_API_KEY=SUA_CHAVE
Rode o projeto:
npm run dev   # se usar Vite
# ou
npm start     # se usar CRA

Abra o navegador em:

http://localhost:5173  # Vite
http://localhost:3000  # CRA

Enunciado do Exercicio: Visão Geral: Você deverá criar uma aplicação em React que consuma a API do TMDB (ou OMDb) para permitir que usuários busquem filmes, vejam detalhes e montem uma lista de favoritos.

Funcionalidades Obrigatórias