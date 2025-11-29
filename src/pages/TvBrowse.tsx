import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { tmdb, Movie as TvShow, Genre } from "@/lib/tmdb";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

const sortOptions = [
  { value: "popularity.desc", label: "Popularno" },
  { value: "vote_average.desc", label: "Najbolje ocenjene" },
  { value: "first_air_date.desc", label: "Najnovije" },
];

const TvBrowse = () => {
  const [shows, setShows] = useState<TvShow[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("popularity.desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const data = await tmdb.getTvGenres();
        setGenres(data);
      } catch (e) {
        console.error("Greška pri učitavanju TV žanrova:", e);
      }
    };
    fetchGenres();
  }, []);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        setLoading(true);
const raw = await tmdb.discover("tv", {
  page,
  sortBy,
  genreId: selectedGenre,
  year: selectedYear,
});

const cleaned = raw.filter((show) => {
  if (!show.poster_path) return false;
  if (!show.first_air_date) return false;

  const year = new Date(show.first_air_date).getFullYear();
  if (!year || year < 1950) return false;

  const rating = typeof show.vote_average === "number" ? show.vote_average : 0;
  const votes = typeof show.vote_count === "number" ? show.vote_count : 0;

  if (rating <= 0 || votes === 0) return false;

  return true;
});


setShows((prev) => (page === 1 ? cleaned : [...prev, ...cleaned]));


      } catch (e) {
        console.error("Greška pri učitavanju serija:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchShows();
  }, [page, sortBy, selectedGenre, selectedYear]);

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

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {shows.map((show) => (
            <div
              key={show.id}
              className="group cursor-pointer"
              onClick={() => navigate(`/tv/${show.id}`)}
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
                <img
                  src={tmdb.getImageUrl(show.poster_path, "w500")}
                  alt={show.name || show.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-sm font-semibold truncate">
                {show.name || show.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {show.first_air_date
                  ? new Date(show.first_air_date).getFullYear()
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

export default TvBrowse;
