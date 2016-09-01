<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests;

class UserController extends Controller
{
  /**
   * Show the page containing an overview of the users anime list.
   *
   * @return \Illuminate\Http\Response
   */
  public function overview() {
    return view('information.about');
  }
}
