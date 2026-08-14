import MoodInput from "../components/MoodInput.jsx";
import PlaylistResults from "../components/PlaylistResults.jsx";
import { useUsername } from "../context/UsernameContext.jsx";
import { useRecommend } from "../hooks/useRecommend.js";

export default function MoodPage() {
  const { username } = useUsername();
  const { submit, loading, playlist, criteria, message, error } = useRecommend(username);
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <MoodInput onSubmit={submit} loading={loading} />
      <PlaylistResults
        loading={loading}
        playlist={playlist}
        criteria={criteria}
        message={message}
        error={error}
      />
    </section>
  );
}
