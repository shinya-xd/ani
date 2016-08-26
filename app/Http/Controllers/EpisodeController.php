<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests;

use App\Show;
use App\Video;

class EpisodeController extends Controller
{
  /**
   * Redirect the user to the episode page with the highest quality mirror picked.
   *
   * @return \Illuminate\Http\Response
   */
  public function gotoEpisode($show_id, $title, $translation_type, $episode_num) {
    $show = Show::getShowFromUrl($show_id, $title);
    if (!isset($show)) {
      abort(404);
    }
    if ($show->id !== (int) $show_id || $title !== slugify($show->title)) {
      return redirect($show->details_url.'/'.$translation_type.'/episode-'.$episode_num);
    }

    $episode = $show->videos()->episode($translation_type, $episode_num)->first();
    if (!isset($episode)) {
      abort(404);
    }

    $bestMirror1 = $episode->best_mirror;
    $bestMirror1->refreshVideoLink();
    $bestMirror2 = $episode->best_mirror;
    while ($bestMirror1->id !== $bestMirror2->id) {
      $bestMirror2->refreshVideoLink();
      $bestMirror1 = $bestMirror2;
      $bestMirror2 = $episode->best_mirror;
    }

    return redirect($bestMirror2->stream_url);
  }

  /**
   * Display a player with the selected mirror.
   * Also show all other available mirrors for the episode.
   *
   * @return \Illuminate\Http\Response
   */
  public function episode($show_id, $title, $translation_type, $episode_num, $streamer, $mirror) {
    $show = Show::getShowFromUrl($show_id, $title);
    if (!isset($show)) {
      abort(404);
    }
    if ($show->id !== (int) $show_id || $title !== slugify($show->title)) {
      return redirect($show->details_url.'/'.$translation_type.'/episode-'.$episode_num.'/'.$streamer.'/'.$mirror);
    }

    $video = $show->videos()->episode($translation_type, $episode_num)->where([
      'streamer_id' => $streamer,
      'mirror' => $mirror,
    ])->first();
    if (!isset($video)) {
      abort(404);
    }
    $video->refreshVideoLink();

    $mirrors = $show->videos()
                    ->episode($translation_type, $episode_num)
                    ->with('streamer')->with('show')
                    ->get();
    if (count($mirrors) == 0) {
      abort(404);
    }

    $resolutions = $mirrors->pluck('resolution')->unique()->sort(function ($a, $b) {
      $aex = explode('x', $a);
      $a = $aex[0] * $aex[1];
      $bex = explode('x', $b);
      $b = $bex[0] * $bex[1];
      if ($a === $b) return 0;
      return ($a > $b) ? -1 : 1;
    })->values();

    if (!visitPage('video_'.$video->id)) {
      $video->hits++;
      $video->save();
    }
    return view('anime.episode', [
      'show' => $show,
      'video' => $video,
      'mirrors' => $mirrors,
      'resolutions' => $resolutions,
    ]);
  }

  /**
   * Show a page linking to the video source.
   * This can be used to provide a static link to the source material.
   *
   * @return \Illuminate\Http\Response
   */
  public function static(Video $video) {
    if (!visitPage('video_'.$video->id)) {
      $video->hits++;
      $video->save();
    }
    $video->refreshVideoLink();
    // TODO: improve this
    return redirect($video->link_video);
  }
}
