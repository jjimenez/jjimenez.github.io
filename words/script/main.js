var word_set;
$( document ).ready(function() {
    $('#regenerate').hide();
	$('#loading').show();
    $.ajax({
	    url: "data/parts_of_speech.json",
	    success: function (data) {
		word_set = data;
		make_haiku(word_set);
		$('#regenerate').on('click', function() { make_haiku(word_set); }).show();
		$('#loading').hide();
	    }
   });
});

function make_haiku(words) {
		var line1 = get_syllables(words, 5);
		var line2 = get_syllables(words, 7);
		var line3 = get_syllables(words, 5);
		$('#line1').text(line1.join(' '));
		$('#line2').text(line2.join(' '));
		$('#line3').text(line3.join(' '));
	
}

function random_selection(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
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
	var return_words = jQuery.map(line_words,function(word) { return word['word']; });
	return return_words;
}

function syllable_total(line) {
	var count = 0;
	jQuery.each(line, function(index, word) { 
		count += parseInt(word.syllables); 
	});
//	console.log(count);
	return count;
}

