The default background music is `zephiramusic-lofi-gaming-606302.mp3` in this folder.
Alternatively, set `NEXT_PUBLIC_GAMES_BGM_URL` to an MP3 URL before building.

The page attempts to play music immediately at 20% volume, looping continuously.
If the browser blocks audible autoplay, playback retries on a click or key press.
The saved mute preference is respected. The existing
sound toggle controls both music and interaction effects. Switching tabs pauses
the music; returning resumes it. Interaction effects remain synthesized locally.

Run `npm run build` after adding or replacing the file for the Flask deployment.
