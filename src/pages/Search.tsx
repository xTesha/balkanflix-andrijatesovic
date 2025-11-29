import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { MovieCard } from "@/components/MovieCard";
import { tmdb, Movie } from "@/lib/tmdb";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchContent = async () => {
      if (!query) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await tmdb.search(query, "multi");
        setResults(data);
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setLoading(false);
      }
    };

    searchContent();
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <h1 className="text-3xl font-bold mb-8">
          {query ? `Rezultati pretrage za: "${query}"` : "Pretraga"}
        </h1>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Učitavanje...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((item) => (
              <MovieCard key={item.id} movie={item} />
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Nema rezultata za vašu pretragu.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Search;
