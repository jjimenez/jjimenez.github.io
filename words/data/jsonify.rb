require_relative 'lib/syllable'
require 'json'

module Words  extend self

	def make_file

		max_lines = 0
		lines_processed = 0

		parts_of_speech_text = %w{N Noun P Plural h Noun_Phrase V Verb t Verb_transitive i Verb_intransitive A Adjective v Adverb C Conjunction P Preposition ! Interjection r Pronoun D Definite_Article I Indefinite_Article o Nominative}

		parts_of_speech = parts_of_speech_text.each_slice(2).to_a

	 	#header = %w{word types syllables} + parts_of_speech.map{ |key, name| name } + 'common'

		words = []
		puts 'processing'
		start_time = Time.now
		common_words = []

		common_words_raw = File.readlines('google-10000-english-usa-no-swears.txt')
		common_words= common_words_raw.collect { |x| x.strip || x }
		common_count = 0

		File.open('part-of-speech.txt', 'r') do |f1|
			line = f1.gets
			while lines_processed < max_lines || (max_lines == 0 && line)
				json_word = {}
				if line
					parts = line.split("\t").collect { |x| x.strip || x }
					word, types = parts
					syllable_count = Syllable.count(word)
					json_word['word'] = word
					json_word['types'] = types
					json_word['syllables'] = syllable_count.to_s
					parts_of_speech.each do |key, name|
						is_part = types.include? key
						json_word[name] = (is_part ? 1 : 0)
					end
					common_count += 1 if common_words.include? word
					json_word['Common'] = (common_words.include?(word) ? 1 : 0)
					words.push(json_word)
				end
				lines_processed += 1
				line = f1.gets
				print '.' if lines_processed % 10000 == 0
				print lines_processed.to_s if lines_processed % 100000 == 0
			end
		end

		File.open('parts_of_speech.json', 'w') do |f2|
			f2.puts words.to_json
		end

		puts "finished #{words.size} words"
		end_time = Time.now
		elapsed = end_time - start_time
		puts "elapsed: #{elapsed}"

		puts "sample"
		sample = words.sample(10)
		puts words.sample(10)

		puts "noun sample"
		puts words.select { |word| word['Noun'] == 1 || word['Noun Phrase'] == 1 }.sample(10)

		puts 'verb sample'
		puts words.select { |word| word['Verb'] == 1 || word['Verb_transitive'] == 1 || word['Verb_intransitive'] == 1 }.sample(10)

		puts "common sample out of #{common_count}"
		puts words.select { |word| word['Common'] == 1 }.sample(10)

	end

	@@words = []

	def read_file
		File.open("parts_of_speech.json", "rb") do |f|
			contents = f.read
		end

		@@words = JSON.parse(contents)
		true
	end

	def words
		@@words
	end

	def make_haiku
		haiku = []
		haiku.push(get_syllables(5))
		haiku.push(get_syllables(7))
		haiku.push(get_syllables(5))
		puts haiku.join("\n")
	end

	def get_syllables(count)
		max_tries = 99
		tries = 0
		line_words = []
		while tries < max_tries
			line_words += words.sample(1)
			potential_count = syllable_total(line_words)
			if potential_count > count
				line_words = []
				tries += 1
                        else 
                          tries = max_tries if potential_count == count
			end
		end
 		potential_line = (line_words.map { |w| w['word']}).join(' ')
	end

	def syllable_total(line)
 		potential_line = (line.map { |w| w['word']}).join(' ')
		count = line.inject(0) { |sum, word| sum += word['syllables'].to_i }
		count
	end

end
