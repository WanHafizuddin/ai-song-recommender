import { useState } from "react";
import { recommend } from "../api.js";

const INITIAL = { loading: false, playlist: null, criteria: null, message: null, error: null };

export function useRecommend(username) {
  const [state, setState] = useState(INITIAL);

  const submit = async (moodText) => {
    setState({ ...INITIAL, loading: true });
    try {
      const data = await recommend(moodText, username);
      setState({
        loading: false,
        playlist: data.playlist,
        criteria: data.criteria,
        message: data.message ?? null,
        error: null,
      });
    } catch (e) {
      setState({ ...INITIAL, error: e.message || "Something went wrong" });
    }
  };

  return { ...state, submit };
}
