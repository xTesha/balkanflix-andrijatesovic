import { useEffect, useState, useRef } from "react";
import { Play, Info as InfoIcon, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tmdb, Movie, MovieDetail as MovieDetailType } from "@/lib/tmdb";
import { useNavigate } from "react-router-dom";

export const Hero = () => {
  const [heroMovie, setHeroMovie] = useState<(Movie & { overview: string }) | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [overviewFallback, setOverviewFallback] = useState(false);

  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Učitavanje hero filma + fallback opis + trailer
  useEffect(() => {
    const fetchHeroMovie = async () => {
      try {
        const trending = await tmdb.getTrending("movie", "week");
        if (!trending || trending.length === 0) return;

        const random =
          trending[Math.floor(Math.random() * Math.min(5, trending.length))];

        const movieId = random.id;

        // Detalji na srpskom + engleskom
        const [sr, en] = await Promise.all([
          tmdb.getMovieDetails(movieId, "sr-RS"),
          tmdb.getMovieDetails(movieId, "en-US"),
        ]);

        let merged: MovieDetailType & { overview: string } = { ...(sr as any) };
        let usedFallback = false;

        if (!sr.overview || sr.overview.trim().length < 10) {
          if (en.overview) {
            merged.overview = en.overview;
            usedFallback = true;
          }
        }

        setHeroMovie(merged);
        setOverviewFallback(usedFallback);

        // Trailer (bez language)
        const videos = await tmdb.getMovieVideos(movieId);
        const trailer = videos.find(
          (v) => v.site === "YouTube" && v.type === "Trailer"
        );
        if (trailer?.key) {
          setTrailerKey(trailer.key);
        } else {
          setTrailerKey(null);
        }
      } catch (err) {
        console.error("Greška pri učitavanju hero filma ili trejlera:", err);
      }
    };

    fetchHeroMovie();
  }, []);

  // 3 sekunde splash pa puštamo trailer
  useEffect(() => {
    if (trailerKey) {
      timeoutRef.current = setTimeout(() => {
        setShowTrailer(true);
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [trailerKey]);

  if (!heroMovie) return null;

  const handlePlay = () => {
    navigate(`/watch/movie/${heroMovie.id}`);
  };

  const handleInfo = () => {
    navigate(`/movie/${heroMovie.id}`);
  };

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      {showTrailer && trailerKey ? (
        <div className="absolute inset-0">
          <iframe
            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${
              isMuted ? 1 : 0
            }&controls=0&showinfo=0&rel=0&loop=1&playlist=${trailerKey}`}
            className="absolute inset-0 w-full h-full scale-150 pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Trailer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-netflix-darker via-netflix-darker/50 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-netflix-darker via-transparent to-transparent pointer-events-none" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-background/20 hover:bg-background/40 pointer-events-auto"
            onClick={() => setIsMuted((prev) => !prev)}
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
        </div>
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${tmdb.getImageUrl(
              heroMovie.backdrop_path,
              "original"
            )})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-netflix-darker via-netflix-darker/50 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-netflix-darker via-transparent to-transparent pointer-events-none" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="relative h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
              {heroMovie.title || (heroMovie as any).name}
            </h1>

            <div className="space-y-2">
              <p className="text-lg md:text-xl text-foreground/90 line-clamp-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                {heroMovie.overview}
              </p>
              {overviewFallback && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                  <InfoIcon className="h-4 w-4" />
                  <span>
                    Opis trenutno nije dostupan na domaćem jeziku – prikazan je
                    originalni opis.
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <Button
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 font-semibold px-8"
                onClick={handlePlay}
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                Reprodukuj
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="bg-secondary/80 hover:bg-secondary font-semibold px-8"
                onClick={handleInfo}
              >
                <InfoIcon className="mr-2 h-5 w-5" />
                Više informacija
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
