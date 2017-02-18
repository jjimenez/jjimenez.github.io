
var word_set;
var big_word_threshhold = 3; // syllables to consider a word big
var big_word_factor = 1.0; // how likely to allow big words between 0 and 1.
var require_vowels = true;  // vowels are nice in words
var remove_acronyms = true; // Acronyms aren't that great
var require_common_words = true; // use only the 10,000 most common words (minus a bunch of swear words)
var require_common_pairs = false; // make sure subsequent words in the same line are commonly found in that order

var tagged_common_words;
var words_to_use;

var grouped_words = [];

var haiku_parts = [['Noun', 'Noun_Phrase'], ['Verb', 'Verb_transitive', 'Verb_intransitive'], ['Adjective'], ['Adverb'], ['Preposition'],['Pronoun'], ['Definite_Article','Indefinite_Article']];
var min_score = 2; // how many haiku_parts have to be in the end result 

var line1_map = ['Noun','Noun'];
var line2_map = ['Definite_Article', 'Noun', 'Verb'];
var line3_map = ['Adverb', 'Preposition', 'Definite_Article', 'Noun'];

var maps = [[line1_map, line2_map, line3_map]];

line1_map = ['Adjective', 'Noun'];
line2_map = ['Definite_Article', 'Noun', 'Verb'];
line3_map = ['Definite_Article', 'Noun', 'Preposition', 'Noun'];

maps.push([line1_map, line2_map, line3_map]);

line1_map = ['Preposition', 'Definite_Article', 'Noun'];
line2_map = ['Preposition', 'Definite_Article', 'Adjective', 'Adjective', 'Noun'];
line3_map = ['Definite_Article', 'Noun', 'Noun'];

maps.push([line1_map, line2_map, line3_map]);



var use_map = -1;

var locks = [false, false, false];
var line1, line2, line3;

$( document ).ready(function() {
    $('.lock').on('click', function(event) {
    	var target = $(event.target).closest('span');
	var icon = target.find('i');
	var which_line = parseInt(target.attr('data-for')) -1;
	var locked = locks[which_line];
	locks[which_line] = !locks[which_line];
	if (locked) {
		icon.removeClass('fa-lock').addClass('fa-unlock');
        } else {
	  icon.removeClass('fa-unlock').addClass('fa-lock');
        }
    });

    $('#controls').hide();
	$('#loading').show();
    $.ajax({
	    url: "data/parts_of_speech.json",
	    success: function (data) {
		word_set = data;
		tagged_common_words  = only_common_words(word_set);
		make_haiku();
		$('#regenerate').on('click', function() { make_haiku(); });
		$('#big_words').on('change', function() {
            		var check = $(this).prop('checked');
			if (check) {
				big_word_factor = 0.2;
			} else {
				big_word_factor = 1.0;
			}
		});
		$('#vowels').on('change', function() {
            		var check = $(this).prop('checked');
			if (check) {
				require_vowels = true;
			} else {
				require_vowels = false;
			}
		});
		$('#acronyms').on('change', function() {
            		var check = $(this).prop('checked');
			if (check) {
				remove_acronyms = true;
			} else {
				remove_acronyms = false;
			}
		});
		$('#common').on('change', function() {
            		var check = $(this).prop('checked');
			if (check) {
				require_common_words = true;
				grouped_words = [];
			} else {
				require_common_words = false;
				grouped_words = [];
			}
		});
		$('#pairs').on('change', function() {
            		var check = $(this).prop('checked');
			if (check) {
				require_common_pairs = true;
			} else {
				require_common_pairs = false;
			}
		});
		$('#controls').show();
		$('#loading').hide();
	    }
   });
});

function haiku_score(words) {
	var current_score = 0;
	// Add one to current_score for each of the required parts of speech
	for (var idx = 0; idx < haiku_parts.length; ++idx) {
		var pos = haiku_parts[idx];
		if (has_pos(words, pos)) {
			current_score += 1;
		}
	}
	return current_score;
}

function has_pos(words, pos){
	var matched_one = false;
	for (var idx = 0; idx < pos.length; ++idx) {
		matched_one = matched_one || match_pos(words, pos[idx]);
	}
	return matched_one;
}

function match_pos(words, part_of_speech) {
	return words.some(function(one_word) {
    		return one_word[part_of_speech] === 1;
  	});
}

function make_haiku() {
		if (require_common_words) { words = tagged_common_words; } else { words = word_set }
		var line1_words, line2_words, line3_words;
		if (use_map > -1) {
			line1_words = get_mapped_words(words, maps[use_map][0], 5);
			line2_words = get_mapped_words(words, maps[use_map][1], 7);
			line3_words = get_mapped_words(words, maps[use_map][2], 5);
		} else {
			line1_words = get_syllables(words, 5, '');
			line2_words = get_syllables(words, 7, line1_words[line1_words.length-1].word);
			line3_words = get_syllables(words, 5, line2_words[line2_words.length-1].word);
		}

		var all_words = line1_words.concat(line2_words).concat(line3_words);
		var score = haiku_score(all_words);

		while (score < min_score) {
			line1_words = get_syllables(words, 5,'');
			line2_words = get_syllables(words, 7, line1_words[line1_words.length-1].word);
			line3_words = get_syllables(words, 5, line2_words[line2_words.length-1].word);
			all_words = line1_words.concat(line2_words).concat(line3_words);
			score = haiku_score(all_words);
			
		}
		
		line1 = locks[0] ? line1 : jQuery.map(line1_words, function(word) { return word.word; } );
		line2 = locks[1] ? line2 : jQuery.map(line2_words, function(word) { return word.word; } );
		line3 = locks[2] ? line3 : jQuery.map(line3_words, function(word) { return word.word; } );

		$('#haiku p').removeClass('failed');
		$('#line1').text(line1.join(' '));
		$('#line2').text(line2.join(' '));
		$('#line3').text(line3.join(' '));
		if ($('.lock i.fa-unlock, .lock i.fa-lock').length == 0) {
			$('.lock i').removeClass('fa-spinner').removeClass('fa-spin').addClass('fa-unlock');
		}
		$("#haiku p:contains('tried hard but failed')").addClass('failed');
		$('#score').text(Math.round(score/haiku_parts.length * 100,2) );
		var twitter_text = [line1.join(' '), line2.join(' '), line3.join(' '),''].join('\n');
		set_twitter_button(twitter_text);
		$('.twitter-share-button').attr('data-text',twitter_text);

	
}

function set_twitter_button(text_to_share) {
	$('#tweet_container').empty();
	if (twttr && twttr.widgets) {
	  twttr.widgets.createShareButton(
  		'https://jjimenez.github.io/words/',
		document.getElementById('tweet_container'),
		{
			text: text_to_share,
			hashtags: 'badhaiku',
			via: 'jj_jose_jimenez',
			size: 'large',
			dnt: true
		}
	  );
	}
}

function random_selection(arr,previous_word) {
	var possible_word = arr[Math.floor(Math.random() * arr.length)];
	var max_tries = 599;
	var tries = 0;
	while (!evaluate_word(possible_word, previous_word) && tries <= max_tries) {
		possible_word = arr[Math.floor(Math.random() * arr.length)];
		tries += 1;
	}
	if (tries > max_tries) { console.log('gave up on finding a word that passed evaluation for previous word: ' + previous_word); }
	return possible_word;
}

function evaluate_word(possible_word, previous_word) {
	return is_short_enough(possible_word) 
		&& has_vowels(possible_word) 
		&& is_not_acronym(possible_word)
		&& is_commonly_paired(previous_word, possible_word.word);
}

function is_commonly_paired(first_word, second_word) {
  if (second_word === '' || !require_common_pairs) { return true; }
  return common_pairs.binaryIndexOf(first_word + ' ' + second_word) > -1;
}

function is_short_enough(possible_word){
	var syllable_count = syllable_total([possible_word]);
	var chance = big_word_factor - (1 - Math.random());
	var word_count = possible_word.word.split(' ').length;
	var syllable_check = !(syllable_count > big_word_threshhold && word_count == 1 && chance < 0.0);
	return syllable_check;
}

function is_not_acronym(possible_word) {
	if (!remove_acronyms) { return true; }
	return (/[a-z]/.test(possible_word.word));
}

function has_vowels(possible_word) {
	if (!require_vowels) { return true; }
	var m = possible_word.word.match(/[aeiouy]/gi);
	return !(m === null);
}

function get_mapped_words(word_list,map, target_count) {
	var potential_line = [];
	var max_tries = 299;
	var tries = 0;
	var matched = false;
	while (tries < max_tries && !matched) {
		var line_words = [];
		// for each pos in the map, get a word of that pos
		for (idx = 0; idx < map.length; ++idx) {
			var pos = map[idx];
			line_words.push(get_pos_word(word_list, pos))
		}
		matched = syllable_total(line_words) == target_count;
		++tries;
		
	}
	if (syllable_total(line_words) != target_count) {
		line_words = [exact_word(word_list,'tried'), exact_word(word_list,'hard'), exact_word(word_list,'but'), exact_word(word_list, 'failed')];
	}
	return line_words;
}

function get_pos_word(word_list, pos) {
	var pos_words = words_by_pos(word_list, pos);
	return random_selection(pos_words,'');
}

function only_common_words(word_list) {
	return words_by_pos(word_list, 'Common');
}
function words_by_pos(word_list, pos) {
	if (grouped_words[pos] == undefined) {
		grouped_words[pos] = word_list.filter(pos_filter.bind(null, pos));
	}
	return grouped_words[pos];
}

function words_by_type(word_list, type) {
	return word_list.filter(type_filter.bind(null, type));
}

function type_filter(type, possible_word, index, array) {
	var re = new RegExp(type, 'gi');
	return possible_word.types.match(re);
}

function exact_word(word_list, word) {
	return word_list.filter(word_filter.bind(null, word))[0];
}

function word_filter(match_word, possible_word, index, array) {
	return possible_word.word == match_word;
}

function pos_filter(pos, possible_word, index, array) {
	return possible_word[pos] == 1;
}

function get_syllables(word_list, target_count, last_word_previous_line) {
	var max_tries = 99;
	var tries = 0;
	var line_words = [];
	var matched = false;
	while (tries < max_tries && !matched) {
		var previous_word = line_words.length > 0 ? line_words[line_words.length -1].word : last_word_previous_line;
		line_words.push(random_selection(word_list, previous_word));
		potential_count = syllable_total(line_words);
		//console.log('potential_count: ' + potential_count);
		if (potential_count > target_count) {
			line_words = [];
			tries += 1;
		} else {
			if (potential_count === target_count) {
				matched = true;
			}
		}
	}
	return line_words;
}

function syllable_total(line) {
	var count = 0;
	jQuery.each(line, function(index, word) { 
		count += parseInt(word.syllables); 
	});
//	console.log(count);
	return count;
}

/**
 * Performs a binary search on the host array. This method can either be
 * injected into Array.prototype or called with a specified scope like this:
 * binaryIndexOf.call(someArray, searchElement);
 *
 * @param {*} searchElement The item to search for within the array.
 * @return {Number} The index of the element which defaults to -1 when not found.
 */
function binaryIndexOf(searchElement) {
	'use strict';

	var minIndex = 0;
	var maxIndex = this.length - 1;
	var currentIndex;
	var currentElement;
	var resultIndex;

	while (minIndex <= maxIndex) {
		resultIndex = currentIndex = (minIndex + maxIndex) / 2 | 0;
		currentElement = this[currentIndex];

		if (currentElement < searchElement) {
			minIndex = currentIndex + 1;
		}
		else if (currentElement > searchElement) {
			maxIndex = currentIndex - 1;
		}
		else {
			return currentIndex;
		}
	}

	return ~maxIndex;
}

Array.prototype.binaryIndexOf = binaryIndexOf;

