var word_set;
var big_word_threshhold = 3; // syllables to consider a word big
var big_word_factor = 1.0; // how likely to allow big words between 0 and 1.

var haiku_parts = [['Noun', 'Noun_Phrase'], ['Verb', 'Verb_transitive', 'Verb_intransitive'], ['Adjective'], ['Adverb'], ['Preposition'],['Pronoun'], ['Definite_Article','Indefinite_Article']];
var min_score = 1; // how many haiku_parts have to be in the end result 

$( document ).ready(function() {
    $('#controls').hide();
	$('#loading').show();
    $.ajax({
	    url: "data/parts_of_speech.json",
	    success: function (data) {
		word_set = data;
		make_haiku(word_set);
		$('#regenerate').on('click', function() { make_haiku(word_set); });
		$('#big_words').on('change', function() {
            		var check = $(this).prop('checked');
			if (check) {
				big_word_factor = 0.2;
			} else {
				big_word_factor = 1.0;
			}
		});
		$('#controls').show();
		$('#loading').hide();
	    }
   });
});

function haiku_score(words) {
	var max_score = 5;
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

function make_haiku(words) {
		var line1_words = get_syllables(words, 5);
		var line2_words = get_syllables(words, 7);
		var line3_words = get_syllables(words, 5);
		var all_words = line1_words.concat(line2_words).concat(line3_words);
		var score = haiku_score(all_words);

		while (score < min_score) {
			line1_words = get_syllables(words, 5);
			line2_words = get_syllables(words, 7);
			line3_words = get_syllables(words, 5);
			all_words = line1_words.concat(line2_words).concat(line3_words);
			score = haiku_score(all_words);
			
		}
		
		var line1 = jQuery.map(line1_words, function(word) { return word.word; } );
		var line2 = jQuery.map(line2_words, function(word) { return word.word; } );
		var line3 = jQuery.map(line3_words, function(word) { return word.word; } );
		$('#line1').text(line1.join(' '));
		$('#line2').text(line2.join(' '));
		$('#line3').text(line3.join(' '));
		$('#score').text(Math.round(score/haiku_parts.length * 100,2) );
		var twitter_text = [line1.join(' '), line2.join(' '), line3.join(' '),''].join('\n');
		set_twitter_button(twitter_text);
		$('.twitter-share-button').attr('data-text',twitter_text);
	
}

function set_twitter_button(text_to_share) {
	$('#tweet_container').empty();
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

function random_selection(arr) {
	var possible_word = arr[Math.floor(Math.random() * arr.length)];
	var syllable_count = syllable_total([possible_word]);
	var chance = big_word_factor - (1 - Math.random());
	var word_count = possible_word.word.split(' ').length;
	while (syllable_count > big_word_threshhold && word_count == 1 && chance < 0.0) {
		possible_word = arr[Math.floor(Math.random() * arr.length)];
		syllable_count = syllable_total([possible_word]);
		chance = big_word_factor - (1 - Math.random());
		word_count = possible_word.word.split(' ').length;
	}
	return possible_word;
}

function get_syllables(word_list, target_count) {
	var max_tries = 99;
	var tries = 0;
	var line_words = [];
	var matched = false;
	while (tries < max_tries && !matched) {
		line_words.push(random_selection(word_list));
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

