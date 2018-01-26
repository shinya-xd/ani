import Cheerio from 'cheerio';
import { Shows } from '/imports/api/shows/shows.js';
import { myanimelist } from './myanimelist';
import { kissanime } from './kissanime';

let streamers = [myanimelist, kissanime];

export default class Streamers {
  static convertCheerioToShow(cheerio, streamer, type) {
    // Create empty show
    let show = {};

    // Get 'type'
    if (streamer[type].attributes.type) {
      show.type = streamer[type].attributes.type(cheerio);
      if (show.type && show.type.cleanWhitespace() === 'Music') {
        return false; // Reject music videos
      }
    }

    // Get 'streamerUrls'
    show.streamerUrls = streamer[type].attributes.streamerUrls(cheerio);
    show.streamerUrls = show.streamerUrls.map((streamerUrl) => {
      streamerUrl.streamer = streamer.id;
      return streamerUrl;
    });

    // Get 'name'
    show.name = streamer[type].attributes.name(cheerio);
    // Get 'altNames'
    if (streamer[type].attributes.altNames) {
      show.altNames = streamer[type].attributes.altNames(cheerio);
    } else {
      show.altNames = [];
    }
    show.altNames.push(show.name);

    // Get 'description'
    if (streamer[type].attributes.description) {
      show.description = streamer[type].attributes.description(cheerio);
    }
    // Get 'malId'
    if (streamer[type].attributes.malId) {
      show.malId = streamer[type].attributes.malId(cheerio);
    }

    // Clean and validate show
    Shows.simpleSchema().clean(show, {
      mutate: true
    });
    Shows.simpleSchema().validate(show);

    // Return the show
    return show;
  }

  static processSearchPage(html, streamer, logData) {
    let results = [];

    if (html) {
      try {
        // Load page
        let page = Cheerio.load(html);

        // Check if we have a show page
        if (streamer.show.checkIfPage(page)) {
          let result = this.processShowPage(html, streamer, logData);
          results.concat(result.partial);
          if (result.full) {
            results.push(result.full);
          }
        }

        // Otherwise we have a search page
        else {
          // For each row of data
          page(streamer.search.rowSelector).each((index, element) => {
            try {
              if (index >= streamer.search.rowSkips) {
                // Create and add show
                let result = this.convertCheerioToShow(page(element), streamer, 'search');
                if (result) {
                  results.push(result);
                }
              }
            }

            catch(err) {
              console.error('Failed to process search page with query: \'' + logData + '\' and streamer: \'' + streamer.id + '\'.');
              console.error('Failed to process row number ' + index + '.');
              console.error(err);
            }
          });
        }
      }

      catch(err) {
        console.error('Failed to process search page with query: \'' + logData + '\' and streamer: \'' + streamer.id + '\'.');
        console.error(err);
      }
    }

    return results;
  }

  static processShowPage(html, streamer, logData) {
    let results = {
      full: false,
      partial: []
    };

    if (html) {
      try {
        // Load page
        let page = Cheerio.load(html);

        // For each related show
        page(streamer.showRelated.rowSelector).each((index, element) => {
          try {
            if (!streamer.showRelated.rowIgnore(page(element))) {
              // Create and add related show
              let result = this.convertCheerioToShow(page(element), streamer, 'showRelated');
              if (result) {
                results.partial.push(result);
              }
            }
          }

          catch(err) {
            console.error('Failed to process show page for show: \'' + logData + '\' and streamer: \'' + streamer.id + '\'.');
            console.error('Failed to process related row number ' + index + '.');
            console.error(err);
          }
        });

        // Create and store show
        let result = this.convertCheerioToShow(page('html'), streamer, 'show');
        if (result) {
          results.full = result;
        }
      }

      catch(err) {
        console.error('Failed to process show page for show: \'' + logData + '\' and streamer: \'' + streamer.id + '\'.');
        console.error(err);
      }
    }

    return results;
  }

  static getSearchResults(url, streamer, logData, resultCallback) {
    downloadWithCallback(url, (html) => {
      resultCallback(this.processSearchPage(html, streamer, logData));
    });
  }

  static getShowResults(url, streamer, logData, resultCallback) {
    downloadWithCallback(url, (html) => {
      resultCallback(this.processShowPage(html, streamer, logData));
    });
  }

  static doSearch(query, resultCallback, doneCallback) {
    let streamersDone = 0;

    // For each streamer
    streamers.forEach((streamer) => {
      // Download and process search results
      this.getSearchResults(streamer.search.createUrl(query), streamer, query, (results) => {

        // Return results
        results.forEach((result) => {
          resultCallback(result);
        });

        // Check if done
        streamersDone++;
        if (streamersDone === streamers.length) {
          doneCallback();
        }

      });
    });
  }

  static createFullShow(altNames, streamerUrls, resultCallback, partialCallback) {
    let streamerUrlsDone = 0;
    let finalResult = {};

    // For each streamer
    streamers.forEach((streamer) => {
      // For each streamer url
      streamerUrls.getPartialObjects({streamer: streamer.id}).forEach((streamerUrl) => {
        // Download and process show page
        this.getShowResults(streamerUrl.url, streamer, altNames[0], (result) => {

          if (result.full) {
            // Merge altNames into working set
            if (result.full.altNames) {
              result.full.altNames.forEach((altName) => {
                if (!altNames.includes(altName)) {
                  altNames.push(altName);
                }
              });
            }

            // Merge show into final result
            Object.keys(result.full).forEach((key) => {
              if (Shows.arrayKeys.includes(key)) {
                if (typeof finalResult[key] === 'undefined') {
                  finalResult[key] = result.full[key];
                } else {
                  finalResult[key] = finalResult[key].concat(result.full[key]);
                }
              }
              else if (streamer.id === 'myanimelist' || typeof finalResult[key] === 'undefined') {
                finalResult[key] = result.full[key];
              }
            });

            // Clean the working result
            Shows.simpleSchema().clean(finalResult, {
              mutate: true
            });
          }

          // Check if done
          streamerUrlsDone++;
          if (streamerUrlsDone === streamerUrls.length) {
            finalResult.streamerUrls = finalResult.streamerUrls.concat(streamerUrls);
            resultCallback(finalResult);
          }

          // Store partial results from show page
          result.partial.forEach((partial) => {
            partialCallback(partial);
          })

        });
      });
    });
  }
}
