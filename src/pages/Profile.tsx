import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { MovieCard } from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";


const Profile = () => {
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchUserData(session.user.id);
    };

    checkUser();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      const [watchLaterData, watchHistoryData] = await Promise.all([
        supabase.from("watch_later").select("*").eq("user_id", userId),
        supabase.from("watch_history").select("*").eq("user_id", userId).order("watched_at", { ascending: false }).limit(20),
      ]);

      setWatchLater(watchLaterData.data || []);
      setWatchHistory(watchHistoryData.data || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Uspešno ste se odjavili");
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Moj profil</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            Odjavi se
          </Button>
        </div>

        <Tabs defaultValue="watch-later" className="w-full">
          <TabsList>
            <TabsTrigger value="watch-later">Gledaj kasnije ({watchLater.length})</TabsTrigger>
            <TabsTrigger value="history">Istorija gledanja</TabsTrigger>
          </TabsList>
          <div className="mt-6 max-w-xs">
  <label className="block text-sm font-medium mb-2">
    Jezik interfejsa i sadržaja
  </label>
  <select
    value={lang}
    onChange={(e) => {
      const val = e.target.value as "sr" | "bs" | "hr" | "en";
      setLang(val);
      // najjednostavnije – reload da se sve refetchuje
      window.location.reload();
    }}
    className="bg-card border border-border text-sm px-3 py-2 rounded-md w-full"
  >
    <option value="bs">Bosanski (latinica)</option>
    <option value="hr">Hrvatski</option>
    <option value="sr">Srpski (ćirilica)</option>
    <option value="en">Engleski</option>
  </select>
</div>


          <TabsContent value="watch-later" className="mt-8">
            {loading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Učitavanje...</p>
              </div>
            ) : watchLater.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {watchLater.map((item) => (
                  <MovieCard
                    key={item.id}
                    movie={{
                      id: item.media_id,
                      title: item.title,
                      name: item.title,
                      poster_path: item.poster_path,
                      media_type: item.media_type,
                      overview: "",
                      backdrop_path: null,
                      vote_average: 0,
                      genre_ids: [],
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Nema sačuvanih stavki.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-8">
            {loading ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Učitavanje...</p>
              </div>
            ) : watchHistory.length > 0 ? (
              <div className="space-y-4">
                {watchHistory.map((item) => (
                  <div key={item.id} className="bg-card p-4 rounded-lg">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Gledano: {new Date(item.watched_at).toLocaleDateString("sr-RS")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground">Nema istorije gledanja.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
