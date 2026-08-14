export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) {
    if (!res.ok) throw new ApiError("Request failed", res.status);
    return null;
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new ApiError((body && body.error) || `Request failed (${res.status})`, res.status);
  }
  return body;
}

export function recommend(moodText, username) {
  return request("/api/recommend", {
    method: "POST",
    body: JSON.stringify({ moodText, username }),
  });
}

export async function getSongs() {
  const body = await request("/api/songs");
  return body.songs;
}

export async function createSong(song) {
  const body = await request("/api/songs", { method: "POST", body: JSON.stringify(song) });
  return body.song;
}

export function deleteSong(id) {
  return request(`/api/songs/${id}`, { method: "DELETE" });
}
