import { Play } from "lucide-react";
import { tmdb, Movie } from "@/lib/tmdb";
import { useNavigate } from "react-router-dom";

interface MovieCardProps {
  movie: Movie;
  mediaType?: "movie" | "tv";
}

export const MovieCard = ({ movie, mediaType = "movie" }: MovieCardProps) => {
  const navigate = useNavigate();
  const type = movie.media_type || mediaType;

  const handleClick = () => {
    navigate(`/${type}/${movie.id}`);
  };

  return (
    <div
      className="group relative flex-shrink-0 w-48 cursor-pointer transition-transform duration-300 hover:scale-110 hover:z-10"
      onClick={handleClick}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md shadow-lg">
        <img
          src={tmdb.getImageUrl(movie.poster_path, "w500")}
          alt={movie.title || movie.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-semibold text-sm mb-1 line-clamp-2">
              {movie.title || movie.name}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-yellow-400">★</span>
                <span>{movie.vote_average.toFixed(1)}</span>
              </div>
              <Play className="h-4 w-4 ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
