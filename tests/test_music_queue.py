import unittest
from unittest.mock import Mock, patch

from cogs.music import Music


class MusicQueueTests(unittest.TestCase):
    def setUp(self):
        self.music = Music.__new__(Music)
        self.music.queues = {}
        self.music.current_songs = {}
        self.music.last_songs = {}
        self.music.requested_songs = {}
        self.music.shuffle_modes = {}
        self.music.shuffle_played = {}
        self.music.played_songs = {}

    @staticmethod
    def song(title):
        return {'title': title, 'webpage_url': f'https://example.test/{title}'}

    def test_normal_playback_advances_without_removing_queue_items(self):
        first, second = self.song('first'), self.song('second')
        self.music.queues[1] = [first, second]

        self.assertIs(self.music._select_next_song(1), first)
        self.music.current_songs[1] = first
        self.music.last_songs[1] = first
        self.assertIs(self.music._select_next_song(1), second)
        self.assertEqual(self.music.queues[1], [first, second])

    def test_shuffle_selects_unplayed_songs_without_reordering_queue(self):
        current, first, second = (self.song(name) for name in ('current', 'first', 'second'))
        self.music.queues[1] = [current, first, second]
        self.music.current_songs[1] = current

        self.assertTrue(self.music.toggle_shuffle(1))
        with patch('cogs.music.random.choice', side_effect=[first, second]) as choose:
            self.assertIs(self.music._select_next_song(1), first)
            self.assertIs(self.music._select_next_song(1), second)
        self.assertIsNone(self.music._select_next_song(1))
        self.assertEqual(choose.call_count, 2)
        self.assertEqual(self.music.queues[1], [current, first, second])

    def test_disabling_shuffle_resets_its_history_and_resumes_queue_order(self):
        current, next_song = self.song('current'), self.song('next')
        self.music.queues[1] = [current, next_song]
        self.music.current_songs[1] = current
        self.music.shuffle_modes[1] = True
        self.music.shuffle_played[1] = {id(current), id(next_song)}

        self.assertFalse(self.music.toggle_shuffle(1))
        self.assertNotIn(1, self.music.shuffle_played)
        self.assertIs(self.music._select_next_song(1), next_song)

    def test_prioritize_moves_song_after_current_and_protects_played_items(self):
        previous, current, upcoming, prioritized = (
            self.song(name) for name in ('previous', 'current', 'upcoming', 'prioritized')
        )
        self.music.queues[1] = [previous, current, upcoming, prioritized]
        self.music.current_songs[1] = current

        self.assertTrue(self.music.prioritize_song(1, 3))
        self.assertEqual(self.music.queues[1], [previous, current, prioritized, upcoming])
        self.music.played_songs[1] = {id(previous)}
        self.assertFalse(self.music.remove_song(1, 0))
        self.assertFalse(self.music.remove_song(1, 1))
        self.assertTrue(self.music.remove_song(1, 3))

    def test_requesting_a_queue_song_selects_it_without_removing_it(self):
        current, selected, following = (
            self.song(name) for name in ('current', 'selected', 'following')
        )
        self.music.queues[1] = [current, selected, following]
        self.music.current_songs[1] = current
        voice_client = Mock()
        voice_client.is_playing.return_value = True
        voice_client.is_paused.return_value = False
        self.music.bot = Mock()
        self.music.bot.get_guild.return_value.voice_client = voice_client

        self.assertTrue(self.music.request_queue_song(1, 1))
        self.assertIs(self.music._select_next_song(1), selected)
        self.music.current_songs[1] = selected
        self.assertIs(self.music._select_next_song(1), following)
        self.assertEqual(self.music.queues[1], [current, selected, following])
        self.assertTrue(self.music.force_skips[1])
        voice_client.stop.assert_called_once_with()

    def test_requesting_the_current_song_does_not_interrupt_playback(self):
        current = self.song('current')
        self.music.queues[1] = [current]
        self.music.current_songs[1] = current
        voice_client = Mock()
        voice_client.is_playing.return_value = True
        voice_client.is_paused.return_value = False
        self.music.bot = Mock()
        self.music.bot.get_guild.return_value.voice_client = voice_client

        self.assertFalse(self.music.request_queue_song(1, 0))
        self.assertNotIn(1, self.music.requested_songs)
        voice_client.stop.assert_not_called()

    def test_clear_queue_removes_every_queued_song_but_keeps_current_song_playing(self):
        current, previous, upcoming = (
            self.song(name) for name in ('current', 'previous', 'upcoming')
        )
        self.music.queues[1] = [current, previous, upcoming]
        self.music.current_songs[1] = current
        self.music.played_songs[1] = {id(previous)}
        self.music.shuffle_modes[1] = True
        self.music.shuffle_played[1] = {id(current), id(previous)}
        self.music.requested_songs[1] = upcoming

        self.music.clear_queue(1)

        self.assertEqual(self.music.queues[1], [])
        self.assertIs(self.music.current_songs[1], current)
        self.assertNotIn(1, self.music.played_songs)
        self.assertEqual(self.music.shuffle_played[1], set())
        self.assertNotIn(1, self.music.requested_songs)
        self.assertTrue(self.music.force_skips[1])


if __name__ == '__main__':
    unittest.main()
