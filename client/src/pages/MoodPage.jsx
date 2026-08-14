import MoodInput from "../components/MoodInput.jsx";
import PlaylistResults from "../components/PlaylistResults.jsx";
import { useUsername } from "../context/UsernameContext.jsx";
import { useRecommend } from "../hooks/useRecommend.js";

export default function MoodPage() {
  const { username } = useUsername();
  const { submit, loading, playlist, criteria, message, error } = useRecommend(username);
  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <div className="pt-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-frost">Now playing as {username}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          How are you
          <br />
          feeling?
        </h1>
        <p className="mt-3 max-w-md text-haze">
          Put a mood into words. We&apos;ll pull real tracks that fit — and tell you why each one made the cut.
        </p>
      </div>
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
