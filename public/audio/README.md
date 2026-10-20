Place your background music at `games-background.mp3` in this folder.
Alternatively, set `NEXT_PUBLIC_GAMES_BGM_URL` to an MP3 URL before building.

Music loops at 20% volume after the first click or key press. The existing
sound toggle controls both music and interaction effects. Switching tabs pauses
the music; returning resumes it. Interaction effects remain synthesized locally.

Run `npm run build` after adding or replacing the file for the Flask deployment.
