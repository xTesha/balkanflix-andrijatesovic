import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { tmdb, Movie, Genre } from "@/lib/tmdb";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i); // npr. zadnjih 50 godina

const sortOptions = [
  { value: "popularity.desc", label: "Popularno" },
  { value: "vote_average.desc", label: "Najbolje ocenjeni" },
  { value: "primary_release_date.desc", label: "Najnoviji" },
];

const Movies = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("popularity.desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // učitavanje žanrova
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await tmdb.getMovieGenres();
        setGenres(data);
      } catch (e) {
        console.error("Greška pri učitavanju žanrova:", e);
      }
    };
    fetchGenres();
  }, []);

  // učitavanje filmova
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
const raw = await tmdb.discover("movie", {
  page,
  sortBy,
  genreId: selectedGenre,
  year: selectedYear,
});

const cleaned = raw.filter((movie) => {
  // mora da ima poster
  if (!movie.poster_path) return false;

  // mora da ima datum izlaska
  if (!movie.release_date) return false;

  const year = new Date(movie.release_date).getFullYear();
  if (!year || year < 1950) return false;

  // 🚫 izbacujemo “mrtve” filmove bez ocene i glasova
  const rating = typeof movie.vote_average === "number" ? movie.vote_average : 0;
  const votes = typeof movie.vote_count === "number" ? movie.vote_count : 0;

  // ocena 0 ili nema glasova -> gotovo sigurno smeće / fan projekat
  if (rating <= 0 || votes === 0) return false;

  return true;
});


setMovies((prev) => (page === 1 ? cleaned : [...prev, ...cleaned]));




      } catch (e) {
        console.error("Greška pri učitavanju filmova:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [page, sortBy, selectedGenre, selectedYear]);

  // kada promenimo filter – resetujemo na stranicu 1
  const resetAndRefetch = () => {
    setPage(1);
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedGenre(value === "all" ? null : Number(value));
    resetAndRefetch();
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedYear(value === "all" ? null : Number(value));
    resetAndRefetch();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    resetAndRefetch();
  };

  const loadMore = () => setPage((p) => p + 1);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-28 pb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">

          <div className="flex flex-wrap gap-3">
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="bg-card border border-border text-sm px-3 py-2 rounded-md"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sortiranje: {opt.label}
                </option>
              ))}
            </select>

            <select
              value={selectedGenre ?? "all"}
              onChange={handleGenreChange}
              className="bg-card border border-border text-sm px-3 py-2 rounded-md"
            >
              <option value="all">Svi žanrovi</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear ?? "all"}
              onChange={handleYearChange}
              className="bg-card border border-border text-sm px-3 py-2 rounded-md"
            >
              <option value="all">Sve godine</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* GRID FILMOVA – Netflix kartice */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="group cursor-pointer"
              onClick={() => navigate(`/movie/${movie.id}`)}
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
                <img
                  src={tmdb.getImageUrl(movie.poster_path, "w500")}
                  alt={movie.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-sm font-semibold truncate">
                {movie.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {movie.release_date
                  ? new Date(movie.release_date).getFullYear()
                  : ""}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 font-semibold"
          >
            {loading ? "Učitavanje..." : "Učitaj još"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Movies;
