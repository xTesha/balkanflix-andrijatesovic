const TMDB_API_KEY = 'c5632362513441998856f721496efc81';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// koje jezike nudimo u app-u
export type AppLanguage = "sr" | "bs" | "hr" | "en";

const APP_LANG_TO_TMDB: Record<AppLanguage, string> = {
  sr: "sr-RS",
  bs: "bs-BA",
  hr: "hr-HR",
  en: "en-US",
};

// globalna TMDB language promenljiva
let CURRENT_TMDB_LANG: string = APP_LANG_TO_TMDB.bs; // default bosanski (latinica)

// pozivaćemo ovo iz React koda kad korisnik promeni jezik
export const setTmdbLanguage = (lang: AppLanguage) => {
  CURRENT_TMDB_LANG = APP_LANG_TO_TMDB[lang] ?? "en-US";
};


export interface Movie {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count?: number;      
  popularity?: number;      
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: "movie" | "tv";
}


export interface MovieDetail extends Movie {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  episodes?: Episode[];
}

export interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  overview: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}


// generalni fetch sa jezikom
const tmdbFetch = async (endpoint: string, language?: string) => {
  const lang = language ?? CURRENT_TMDB_LANG;

  const response = await fetch(
    `${TMDB_BASE_URL}${endpoint}${
      endpoint.includes("?") ? "&" : "?"
    }api_key=${TMDB_API_KEY}&language=${lang}`
  );
  if (!response.ok) throw new Error("Failed to fetch from TMDB");
  return response.json();
};


// fetch bez language parametra (za videos)
const tmdbFetchNoLang = async (endpoint: string) => {
  const response = await fetch(
    `${TMDB_BASE_URL}${endpoint}${
      endpoint.includes('?') ? '&' : '?'
    }api_key=${TMDB_API_KEY}`
  );
  if (!response.ok) throw new Error('Failed to fetch from TMDB (no lang)');
  return response.json();
};

export const tmdb = {
  getImageUrl: (
    path: string | null,
    size: 'w500' | 'w780' | 'original' = 'w500'
  ) => {
    if (!path) return '/placeholder.svg';
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
  },

  // --- LISTE ---

  getTrending: async (
    mediaType: 'movie' | 'tv' | 'all' = 'all',
    timeWindow: 'day' | 'week' = 'week'
  ) => {
    const data = await tmdbFetch(`/trending/${mediaType}/${timeWindow}`);
    return data.results as Movie[];
  },

  getPopular: async (mediaType: 'movie' | 'tv' = 'movie') => {
    const data = await tmdbFetch(`/${mediaType}/popular`);
    return data.results as Movie[];
  },

  getTopRated: async (mediaType: 'movie' | 'tv' = 'movie') => {
    const data = await tmdbFetch(`/${mediaType}/top_rated`);
    return data.results as Movie[];
  },

  getNowPlaying: async () => {
    const data = await tmdbFetch('/movie/now_playing');
    return data.results as Movie[];
  },

  getUpcoming: async () => {
    const data = await tmdbFetch('/movie/upcoming');
    return data.results as Movie[];
  },

  // --- DETALJI FILM - SERIJA - SEZONA ---

getMovieDetails: async (id: number, language?: string) => {
  const data = await tmdbFetch(`/movie/${id}`, language);
  return data as MovieDetail;
},

getTvDetails: async (id: number, language?: string) => {
  const data = await tmdbFetch(`/tv/${id}`, language);
  return data as MovieDetail;
},

getTvSeason: async (tvId: number, seasonNumber: number, language?: string) => {
  const data = await tmdbFetch(`/tv/${tvId}/season/${seasonNumber}`, language);
  return data as Season;
},


  // --- ŽANROVI ---

  getMovieGenres: async () => {
    const data = await tmdbFetch('/genre/movie/list');
    return data.genres as Genre[];
  },

  getTvGenres: async () => {
    const data = await tmdbFetch('/genre/tv/list');
    return data.genres as Genre[];
  },

  getByGenre: async (genreId: number, mediaType: 'movie' | 'tv' = 'movie') => {
    const data = await tmdbFetch(`/discover/${mediaType}?with_genres=${genreId}`);
    return data.results as Movie[];
  },

  search: async (
    query: string,
    mediaType: 'movie' | 'tv' | 'multi' = 'multi'
  ) => {
    const data = await tmdbFetch(
      `/search/${mediaType}?query=${encodeURIComponent(query)}`
    );
    return data.results as Movie[];
  },

  // --- DISCOVER (za listanje filmova/serija sa filtrima) ---
discover: async (
  mediaType: "movie" | "tv",
  options: {
    page?: number;
    sortBy?: string; // npr. "popularity.desc"
    genreId?: number | null;
    year?: number | null;
  } = {}
) => {
  const params: Record<string, string> = {};

  // stranica
  params.page = String(options.page ?? 1);

  // sortiranje
  const sortBy = options.sortBy || "popularity.desc";
  params.sort_by = sortBy;

  // žanr
  if (options.genreId) {
    params.with_genres = String(options.genreId);
  }

  // ako korisnik izabere konkretno godinu – koristimo je
  if (options.year) {
    if (mediaType === "movie") {
      params.primary_release_year = String(options.year);
    } else {
      params.first_air_date_year = String(options.year);
    }
  } else {
    // ako NEMA godine, a sortira se po datumu,
    // ograničimo da bude do danas (da ne vraća buduće gluposti)
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (mediaType === "movie" && sortBy.startsWith("primary_release_date")) {
      params["primary_release_date.lte"] = today;
    }

    if (mediaType === "tv" && sortBy.startsWith("first_air_date")) {
      params["first_air_date.lte"] = today;
    }
  }

  const query = new URLSearchParams(params).toString();

  // 👇 bitno: za discover koristimo ENGLISH da dobijemo kompletan katalog
  const data = await tmdbFetch(`/discover/${mediaType}?${query}`, "en-US");
  return data.results as Movie[];
},

  // --- CREDITS & PREPORUKE ---

  getMovieCredits: async (id: number) => {
    const data = await tmdbFetch(`/movie/${id}/credits`, "en-US");
    return data.cast as CastMember[];
  },

  getMovieRecommendations: async (id: number) => {
    const data = await tmdbFetch(`/movie/${id}/recommendations`, "en-US");
    return data.results as Movie[];
  },

  getTvCredits: async (id: number) => {
    const data = await tmdbFetch(`/tv/${id}/credits`, "en-US");
    return data.cast as CastMember[];
  },

  getTvRecommendations: async (id: number) => {
    const data = await tmdbFetch(`/tv/${id}/recommendations`, "en-US");
    return data.results as Movie[];
  },



  // --- VIDEOS (bez language) ---

  getMovieVideos: async (id: number) => {
    const data = await tmdbFetchNoLang(`/movie/${id}/videos`);
    return data.results as Array<{ key: string; type: string; site: string }>;
  },

  getTvVideos: async (id: number) => {
    const data = await tmdbFetchNoLang(`/tv/${id}/videos`);
    return data.results as Array<{ key: string; type: string; site: string }>;
  },
};

