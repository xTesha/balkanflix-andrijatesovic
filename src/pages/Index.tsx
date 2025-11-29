import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Carousel } from "@/components/Carousel";
import { tmdb, Movie, Genre } from "@/lib/tmdb";

const Index = () => {
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTv, setPopularTv] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [genreMovies, setGenreMovies] = useState<Record<number, Movie[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, popularMoviesData, popularTvData, topRatedData, genresData] = await Promise.all([
          tmdb.getTrending("all", "week"),
          tmdb.getPopular("movie"),
          tmdb.getPopular("tv"),
          tmdb.getTopRated("movie"),
          tmdb.getMovieGenres(),
        ]);

        setTrending(trendingData);
        setPopularMovies(popularMoviesData);
        setPopularTv(popularTvData);
        setTopRatedMovies(topRatedData);
        setGenres(genresData.slice(0, 3));

        const genreMoviesData: Record<number, Movie[]> = {};
        for (const genre of genresData.slice(0, 3)) {
          const movies = await tmdb.getByGenre(genre.id, "movie");
          genreMoviesData[genre.id] = movies;
        }
        setGenreMovies(genreMoviesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      
      <div className="space-y-8 pb-20">
        <Carousel title="Popularna izdanja" movies={trending} />
        <Carousel title="Popularni filmovi" movies={popularMovies} mediaType="movie" />
        <Carousel title="Najbolje ocenjeni filmovi" movies={topRatedMovies} mediaType="movie" />
        <Carousel title="Popularne serije" movies={popularTv} mediaType="tv" />
        
        {genres.map((genre) => (
          <Carousel
            key={genre.id}
            title={genre.name}
            movies={genreMovies[genre.id] || []}
            mediaType="movie"
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
