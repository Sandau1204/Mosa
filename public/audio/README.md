The default menu and in-game background music is `zephiramusic-lofi-gaming-606302.mp3` in this folder.
Set `NEXT_PUBLIC_GAMES_MENU_BGM_URL` and `NEXT_PUBLIC_GAMES_PLAY_BGM_URL` to separate MP3 URLs before building to use different tracks. The legacy `NEXT_PUBLIC_GAMES_BGM_URL` value remains a shared fallback for either channel.

Menu music and in-game music share one saved mute preference; synthesized interaction
effects have a separate preference. Chess and Xiangqi rooms do not play background music;
their floating audio button controls interaction effects only and does not change the
shared music preference. Playback loops at 20% volume
and retries after a click or key press if autoplay is blocked. Switching tabs pauses
music; returning resumes it.

Run `npm run build` after adding or replacing the file for the Flask deployment.
