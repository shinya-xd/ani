import Cheerio from 'cheerio';
import {Shows} from '/imports/api/shows/shows.js';

export let kissanime = {
  // General data
  id: 'kissanime',
  name: 'KissAnime',
  homepage: 'http://kissanime.ru',

  // Search page data
  search: {
    createUrl: function(query) {
      return 'http://kissanime.ru/Search/Anime?keyword=' + encodeURIComponentReplaceSpaces(query, '+');
    },
    rowSelector: 'table.listing tbody tr',
    rowSkips: 2,

    // Search page attribute data
    attributes: {
      streamerUrls: function(partial) {
        return [{
          type: partial.find('td:first-of-type a').text().match(/\(Dub\)$/) ? 'dub' : 'sub',
          url: kissanime.homepage + partial.find('td:first-of-type a').attr('href')
        }];
      },
      name: function(partial) {
        return  partial.find('td:first-of-type a').text().replace(/\(Dub\)$/, '').replace(/\(Sub\)$/, '');
      },
      description: function(partial) {
        return Cheerio.load(partial.find('td:first-of-type').attr('title'))('div p').text().replace(/ \.\.\.\n\s*$/, Shows.descriptionCutoff);
      },
    },
  },

  // Show page data
  show: {
    checkIfPage: function(page) {
      return page('title').text().cleanWhitespace().match(/^.* anime \| Watch .* anime online in high quality$/);
    },

    // Show page attribute data
    attributes: {
      streamerUrls: function(partial) {
        return [{
          type: partial.find('a.bigChar').text().match(/\(Dub\)$/) ? 'dub' : 'sub',
          url: kissanime.homepage + partial.find('a.bigChar').attr('href')
        }];
      },
      name: function(partial) {
        return partial.find('a.bigChar').text().replace(/\(Dub\)$/, '').replace(/\(Sub\)$/, '');
      },
      altNames: function(partial) {
        if (partial.find('.bigBarContainer .barContent div:nth-of-type(2) p:first-of-type').find('span.info').text() !== 'Other name:') {
          return [];
        }
        return partial.find('.bigBarContainer .barContent div:nth-of-type(2) p:first-of-type').find('a').map((index, element) => {
          return partial.find(element).text();
        }).get();
      },
      description: function(partial) {
        return partial.find('.bigBarContainer .barContent div:nth-of-type(2) p:nth-last-of-type(2)').html();
      },
      type: function(partial) {
        let genres = [];

        partial.find('.bigBarContainer .barContent div:nth-of-type(2) p').each((index, element) => {
          let paragraph = partial.find(element);
          if (paragraph.find('span:first-of-type').text() === 'Genres:') {
            genres = paragraph.find('a').map((index, element) => {
              return partial.find(element).text();
            }).get();
          }
        });

        let types = ['OVA', 'Movie', 'Special', 'ONA'];
        for (let i = 0; i < types.length; i++) {
          if (genres.includes(types[i])) {
            return types[i];
          }
        }
      },
    },
  },

  // Related shows data
  showRelated: {
    rowSelector: 'div#rightside div:nth-of-type(3) div.barContent div:nth-of-type(2) a',
    rowIgnore: function(partial) {
      return partial.attr('href').count('/') > 2;
    },

    // Related shows attribute data
    attributes: {
      streamerUrls: function(partial) {
        return [{
          type: partial.text().match(/\(Dub\)$/) ? 'dub' : 'sub',
          url: kissanime.homepage + partial.attr('href')
        }];
      },
      name: function(partial) {
        return partial.text().replace(/\(Dub\)$/, '').replace(/\(Sub\)$/, '');
      },
    },
  },
};
