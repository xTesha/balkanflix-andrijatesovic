import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Watch = () => {
  const { type, id, season, episode } = useParams<{
    type: "movie" | "tv";
    id: string;
    season?: string;
    episode?: string;
  }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    // Track watch history – greške ignorišemo da ne ruše player
    if (user && id) {
      const trackWatching = async () => {
        try {
          await supabase.from("watch_history").insert({
            user_id: user.id,
            media_type: type,
            media_id: parseInt(id),
            title: "Watching",
            watch_time_seconds: 0,
          });
        } catch (error) {
          console.warn("Greška pri upisu u watch_history:", error);
        }
      };
      trackWatching();
    }
  }, [user, id, type]);

  const getEmbedUrl = () => {
    if (!id) return "";

    if (type === "movie") {
      // Movie endpoint iz dokumentacije
      return `https://vidfast.to/embed/movie/${id}`;
    }

    if (type === "tv" && season && episode) {
      // TV endpoint iz dokumentacije
      return `https://vidfast.to/embed/tv/${id}/${season}/${episode}`;
    }

    return "";
  };

  const src = getEmbedUrl();
  console.log("VidFast embed URL:", { type, id, season, episode, src });

  return (
    <div className="relative h-screen bg-black">
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="bg-background/20 hover:bg-background/40"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {src ? (
        <iframe
          src={src}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; encrypted-media"
          title="Video Player"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          Nije moguće učitati video (nema ispravan URL).
        </div>
      )}
    </div>
  );
};

export default Watch;
