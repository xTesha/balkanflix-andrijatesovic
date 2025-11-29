import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Plus, Check, Volume2, VolumeX, Info } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  tmdb,
  MovieDetail as MovieDetailType,
  Movie,
  CastMember,
} from "@/lib/tmdb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MovieDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [movie, setMovie] = useState<MovieDetailType | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [overviewFallback, setOverviewFallback] = useState(false);

  const [cast, setCast] = useState<CastMember[]>([]);
  const [recommendations, setRecommendations] = useState<Movie[]>([]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // detalji + trailer + cast + preporuke
  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      const movieId = parseInt(id);

      try {
        // lokalni jezik + eng paralelno za detalje
        const [local, en] = await Promise.all([
          tmdb.getMovieDetails(movieId),          // koristi default / globalni TMDB jezik
          tmdb.getMovieDetails(movieId, "en-US"), // fallback engleski
        ]);

        let merged: MovieDetailType = { ...(local as any) };
        let usedFallback = false;

        if (!local.overview || local.overview.trim().length < 10) {
          if (en.overview) {
            merged.overview = en.overview;
            usedFallback = true;
          }
        }

        setMovie(merged);
        setOverviewFallback(usedFallback);

        // trailer + cast + preporuke u paraleli
        const [videos, credits, recs] = await Promise.all([
          tmdb.getMovieVideos(movieId),
          tmdb.getMovieCredits(movieId),
          tmdb.getMovieRecommendations(movieId),
        ]);

        const trailer = videos.find(
          (v) => v.type === "Trailer" && v.site === "YouTube"
        );
        if (trailer) setTrailerKey(trailer.key);

        // cast – uzmi prvih 12 sa profilnom slikom
        const mainCast = credits
          .filter((c) => c.profile_path)
          .sort((a, b) => a.order - b.order)
          .slice(0, 12);
        setCast(mainCast);

        // preporuke – samo sa posterom
        const recClean = recs.filter((r) => r.poster_path).slice(0, 12);
        setRecommendations(recClean);
      } catch (error) {
        console.error("Error fetching movie:", error);
      }
    };

    fetchMovie();
  }, [id]);

  // delay za trailer
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

  // watch later
  useEffect(() => {
    const checkWatchLater = async () => {
      if (!user || !id) return;

      const { data } = await supabase
        .from("watch_later")
        .select()
        .eq("user_id", user.id)
        .eq("media_type", "movie")
        .eq("media_id", parseInt(id))
        .single();

      setIsInWatchLater(!!data);
    };

    checkWatchLater();
  }, [user, id]);

  const handleWatchLater = async () => {
    if (!user) {
      toast.error("Prijavite se da biste dodali u listu");
      navigate("/auth");
      return;
    }
    if (!movie) return;

    if (isInWatchLater) {
      await supabase
        .from("watch_later")
        .delete()
        .eq("user_id", user.id)
        .eq("media_type", "movie")
        .eq("media_id", movie.id);

      setIsInWatchLater(false);
      toast.success("Uklonjeno iz liste");
    } else {
      await supabase.from("watch_later").insert({
        user_id: user.id,
        media_type: "movie",
        media_id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
      });

      setIsInWatchLater(true);
      toast.success("Dodato u listu za kasnije");
    }
  };

  if (!movie) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO */}
      <div className="relative h-[80vh] w-full overflow-hidden">
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
                movie.backdrop_path,
                "original"
              )})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-netflix-darker via-netflix-darker/50 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-netflix-darker via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 h-full flex items-end md:items-center">
          <div className="flex flex-col md:flex-row gap-8">
            <img
              src={tmdb.getImageUrl(movie.poster_path, "w500")}
              alt={movie.title}
              className="w-64 rounded-lg shadow-2xl"
            />

            <div className="flex-1 space-y-6">
              <h1 className="text-5xl font-bold">{movie.title}</h1>

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  {movie.vote_average.toFixed(1)}
                </span>
                {movie.runtime && <span>{movie.runtime} min</span>}
                {movie.release_date && (
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-secondary rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-lg text-foreground/90 leading-relaxed">
                  {movie.overview}
                </p>
                {overviewFallback && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>
                      Opis trenutno nije dostupan na odabranom jeziku – prikazan
                      je originalni opis.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => navigate(`/watch/movie/${movie.id}`)}
                >
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  Reprodukuj
                </Button>

                <Button size="lg" variant="secondary" onClick={handleWatchLater}>
                  {isInWatchLater ? (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      U listi
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Gledaj kasnije
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAST KAROSEL */}
      {cast.length > 0 && (
        <div className="container mx-auto px-4 pt-8 pb-4">
          <h2 className="text-2xl font-semibold mb-4">Glavne uloge</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {cast.map((person) => (
              <div
                key={person.id}
                className="w-28 flex-shrink-0 text-center"
              >
                <div className="aspect-[2/3] rounded-md overflow-hidden bg-muted mb-2">
                  <img
                    src={tmdb.getImageUrl(person.profile_path, "w500")}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-semibold truncate">{person.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {person.character}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PREPORUKE */}
      {recommendations.length > 0 && (
        <div className="container mx-auto px-4 pb-12 pt-4">
          <h2 className="text-2xl font-semibold mb-4">Slično ovom filmu</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/movie/${rec.id}`)}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
                  <img
                    src={tmdb.getImageUrl(rec.poster_path, "w500")}
                    alt={rec.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-sm font-semibold truncate">
                  {rec.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rec.release_date
                    ? new Date(rec.release_date).getFullYear()
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetail;
