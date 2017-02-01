require_relative 'lib/syllable'
require 'json'


def make_file

  max_lines = 0
  lines_processed = 0

  parts_of_speech_text = %w{N Noun P Plural h Noun_Phrase V Verb t Verb_transitive i Verb_intransitive A Adjective v Adverb C Conjunction P Preposition ! Interjection r Pronoun D Definite_Article I Indefinite_Article o Nominative}

  parts_of_speech = parts_of_speech_text.each_slice(2).to_a

#header = %w{word types syllables} + parts_of_speech.map{ |key, name| name }

  words = []
  puts 'processing'
  start_time = Time.now

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
        words.push(json_word)
      end
      lines_processed += 1
      line = f1.gets
      print '.' if lines_processed % 10000 == 0
      print lines_processed.to_s if lines_processed % 100000 == 0
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

  end

  words = []

  def read_file
    file = File.open("parts_of_speech.json", "rb")
    contents = file.read

    words = JSON.parse(contents)
  end

  def make_haiku
    haiku = [get_syllables(5)] + [get_syllables(7)] + [get_sillables(5)]
    puts haiku.join("\n")
  end

  def get_syllables(count)
    max_tries = 99
    tries = 0
    line_words = []
    while tries < max_tries
      line_words.push(words.sample(1))
      if syllable_total(line_words) > count
        line_words = []
        tries += 1
      end
    end
    line_words.map { |word| word.word }
  end

  def syllable_total(line)
    line.sum { |word| word[syllables] }
  end


  make_haiku

end