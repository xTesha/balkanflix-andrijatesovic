import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Play,
  Plus,
  Check,
  Volume2,
  VolumeX,
  Info,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  tmdb,
  MovieDetail as TvDetailType,
  Season,
  Movie as TvShow,
  CastMember,
} from "@/lib/tmdb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TvDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [show, setShow] = useState<TvDetailType | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [overviewFallback, setOverviewFallback] = useState(false);

  const [cast, setCast] = useState<CastMember[]>([]);
  const [recommendations, setRecommendations] = useState<TvShow[]>([]);

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

  // helper za merge sezone (sr + en)
  const mergeSeason = (sr: Season, en?: Season): Season => {
    if (!en || !en.episodes) return sr;
    if (!sr.episodes) return sr;

    const mergedEpisodes = sr.episodes.map((ep) => {
      const enEp = en.episodes?.find(
        (e) => e.episode_number === ep.episode_number
      );
      const merged: any = { ...ep };

      if ((!ep.overview || ep.overview.trim().length < 10) && enEp?.overview) {
        merged.overview = enEp.overview;
        merged._overviewFromEnglish = true;
      }

      return merged as any;
    });

    return { ...sr, episodes: mergedEpisodes };
  };

  // TV detalji + prva sezona + trailer + cast + preporuke
  useEffect(() => {
    const fetchShow = async () => {
      if (!id) return;
      const tvId = parseInt(id);

      try {
        // sr + en za seriju
        const [srShow, enShow] = await Promise.all([
          tmdb.getTvDetails(tvId, "sr-RS"),
          tmdb.getTvDetails(tvId, "en-US"),
        ]);

        let mergedShow: TvDetailType = { ...(srShow as any) };
        let usedFallback = false;

        if (!srShow.overview || srShow.overview.trim().length < 10) {
          if (enShow.overview) {
            mergedShow.overview = enShow.overview;
            usedFallback = true;
          }
        }

        setShow(mergedShow);
        setOverviewFallback(usedFallback);

        // prva sezona (sr + en)
        const seasons = srShow.seasons ?? enShow.seasons;
        if (seasons && seasons.length > 0) {
          const seasonNumber = seasons[0].season_number;

          const [srSeason, enSeason] = await Promise.all([
            tmdb.getTvSeason(tvId, seasonNumber, "sr-RS"),
            tmdb.getTvSeason(tvId, seasonNumber, "en-US"),
          ]);

          setSelectedSeason(mergeSeason(srSeason, enSeason));
        }

        // trailer, cast, preporuke u paraleli
        const [videos, credits, recs] = await Promise.all([
          tmdb.getTvVideos(tvId),
          tmdb.getTvCredits(tvId),
          tmdb.getTvRecommendations(tvId),
        ]);

        const trailer = videos.find(
          (v) => v.type === "Trailer" && v.site === "YouTube"
        );
        if (trailer) setTrailerKey(trailer.key);

        const mainCast = credits
          .filter((c) => c.profile_path)
          .sort((a, b) => a.order - b.order)
          .slice(0, 12);
        setCast(mainCast);

        const recClean = recs.filter((r) => r.poster_path).slice(0, 12);
        setRecommendations(recClean);
      } catch (error) {
        console.error("Error fetching TV show:", error);
      }
    };

    fetchShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // delay 3s za trailer
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
        .eq("media_type", "tv")
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

    if (!show) return;

    if (isInWatchLater) {
      await supabase
        .from("watch_later")
        .delete()
        .eq("user_id", user.id)
        .eq("media_type", "tv")
        .eq("media_id", show.id);

      setIsInWatchLater(false);
      toast.success("Uklonjeno iz liste");
    } else {
      await supabase.from("watch_later").insert({
        user_id: user.id,
        media_type: "tv",
        media_id: show.id,
        title: show.name || show.title,
        poster_path: show.poster_path,
      });

      setIsInWatchLater(true);
      toast.success("Dodato u listu za kasnije");
    }
  };

  const handleLoadSeason = async (seasonNumber: number) => {
    if (!id) return;
    const tvId = parseInt(id);

    const [srSeason, enSeason] = await Promise.all([
      tmdb.getTvSeason(tvId, seasonNumber, "sr-RS"),
      tmdb.getTvSeason(tvId, seasonNumber, "en-US"),
    ]);

    setSelectedSeason(mergeSeason(srSeason, enSeason));
  };

  if (!show) return null;

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
                show.backdrop_path,
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
              src={tmdb.getImageUrl(show.poster_path, "w500")}
              alt={show.name || show.title}
              className="w-64 rounded-lg shadow-2xl"
            />

            <div className="flex-1 space-y-6">
              <h1 className="text-5xl font-bold">
                {show.name || show.title}
              </h1>

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  {show.vote_average.toFixed(1)}
                </span>
                {show.number_of_seasons && (
                  <span>
                    {show.number_of_seasons}{" "}
                    {show.number_of_seasons === 1 ? "sezona" : "sezona"}
                  </span>
                )}
                {show.first_air_date && (
                  <span>{new Date(show.first_air_date).getFullYear()}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {show.genres.map((genre) => (
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
                  {show.overview}
                </p>
                {overviewFallback && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>
                      Opis trenutno nije dostupan na srpskom jeziku – prikazan
                      je originalni opis.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleWatchLater}
                >
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

      {/* SEZONE + EPIZODE */}
      {show.seasons && show.seasons.length > 0 && (
        <div className="container mx-auto px-4 pb-16 pt-4">
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              {show.seasons.map((season) => (
                <Button
                  key={season.id}
                  variant={
                    selectedSeason?.season_number === season.season_number
                      ? "default"
                      : "outline"
                  }
                  onClick={() => handleLoadSeason(season.season_number)}
                >
                  Sezona {season.season_number}
                </Button>
              ))}
            </div>

            {selectedSeason?.episodes && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Epizode</h2>
                <div className="grid gap-4">
                  {selectedSeason.episodes.map((episode: any) => (
                    <div
                      key={episode.id}
                      className="bg-card p-4 rounded-lg flex gap-4 cursor-pointer hover:bg-card/80 transition-colors"
                      onClick={() =>
                        navigate(
                          `/watch/tv/${id}/${selectedSeason.season_number}/${episode.episode_number}`
                        )
                      }
                    >
                      {episode.still_path && (
                        <img
                          src={tmdb.getImageUrl(episode.still_path, "w500")}
                          alt={episode.name}
                          className="w-48 rounded"
                        />
                      )}
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-lg">
                          {episode.episode_number}. {episode.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {episode.overview || "Opis nije dostupan."}
                        </p>
                        {episode._overviewFromEnglish && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Info className="h-3 w-3" />
                            <span>
                              Opis epizode je prikazan na originalnom jeziku.
                            </span>
                          </div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost">
                        <Play className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PREPORUKE – SLIČNE SERIJE */}
      {recommendations.length > 0 && (
        <div className="container mx-auto px-4 pb-12">
          <h2 className="text-2xl font-semibold mb-4">Slične serije</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/tv/${rec.id}`)}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-muted">
                  <img
                    src={tmdb.getImageUrl(rec.poster_path, "w500")}
                    alt={rec.name || rec.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-sm font-semibold truncate">
                  {rec.name || rec.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rec.first_air_date
                    ? new Date(rec.first_air_date).getFullYear()
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

export default TvDetail;
