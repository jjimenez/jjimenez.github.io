# to read / write json
require 'json'
require 'byebug'
require 'date'
require 'memory_profiler'
require 'redis'

redis = Redis.new({timeout:180 })

# to work with matrices
require 'matrix'

# to generate term frequency / inverse document frequency similarity
require 'tf-idf-similarity'

# to make matrix work faster
require 'narray'

def create_person(entry, user_id)
  person = {}
  @copy_keys.each { |key| person[key] = entry[key]}
  @push_keys.keys.each {|key| person[key] = []}
  person[:pi_count] = 0
  person[:coi_count] = 0
  person[:tech_count] = 0
  return person
end

# Takes one or more objects and a block of code
# if any of the objects are nil then nil is returned
# else the block is run
def nif(obj)
  arr = [obj].flatten
  arr.each do |a|
    if a.nil?
      return nil
    end
  end

  yield
end

def create_routing_form(entry, rf_id)
  rf = {}
  rf[:pis] = []
  rf[:cois] = []
  rf[:techs] = []
  rf[:seqnum] = []
  rf[:appldate] = nif(entry[:appldate]){Date.strptime(entry[:appldate].split(' ').first, '%Y-%m-%d')}
  rf[:dspcodeddate] = nif(entry[:dspcodeddate]){Date.strptime(entry[:dspcodeddate].split(' ').first, '%Y-%m-%d')}
  return rf
end

def report_time(message)
  time_from_start = Time.new(0) + (Time.now - @start_time)
  time_from_interval = Time.new(0) + (Time.now - @last_interval)
  puts "   Now: #{Time.now.strftime('%H:%M:%S.%L')}"
  puts "   From Start: #{time_from_start.strftime('%H:%M:%S.%L')}"
  puts "   From Last Interval: #{time_from_interval.strftime('%H:%M:%S.%L')}"
  puts "Time check (#{message}): "
  @last_interval = Time.now
end

#mp = MemoryProfiler.report do
  @start_time = Time.now
  @last_interval = @start_time

  # read the dbvisualization data
  file = File.read('new_adjacency.json');

  # parse it
  data_hash = JSON.parse(file, {symbolize_names: true});

  # create nodes list
  # nodes are one per person keyed by user_id with the following fields:
  # display_name_reverse
  # org
  # department
  # official_title
  # titles
  # summaries
  # centers


  report_time "Starting Up"
  @copy_keys = [:user_id, :display_name_reverse, :Org, :department, :official_title]
  @push_keys = {}
  @push_keys[:titles] = :title
  @push_keys[:summaries] = :summary
  @push_keys[:centers] = :Center

  report_time "Creating Nodes and Routing Forms"

  @rfs = {}

  data_hash.each do |entry|
    user_id = entry[:user_id]

    # Begin setup/update of person
    red_person = redis.get("person:#{user_id}")
    red_person = JSON.parse(red_person, {symbolize_names: true}) if red_person

    person = red_person ||= create_person(entry, user_id)

    @push_keys.keys.each {|key| person[key] |= [entry[@push_keys[key]]]}
    person[:pi_count] = person[:pi_count] + 1 if entry[:type] == 'Project::RoutingForm::PI'
    person[:coi_count] = person[:coi_count]+ 1 if entry[:type] == 'Project::RoutingForm::Investigator'
    person[:tech_count] =  person[:tech_count] + 1 if entry[:type] == 'Project::RoutingForm::Technician'

    application_date = nif(entry[:appldate]){Date.strptime(entry[:appldate].split(' ').first, '%Y-%m-%d')}
    if person[:appldate].nil? || (person[:appldate] && application_date && Date.strptime(person[:appldate].split(' ').first, '%Y-%m-%d') < application_date)
      person[:appldate] = application_date
    end
    redis.set("person:#{person[:user_id]}", person.to_json)
    # End setup/update of person

    # Begin setup/update of rf
    rf_id = entry[:routing_form_number]

    red_rf = redis.get("rf:#{rf_id}")
    red_rf = red_rf.nil? ? nil : JSON.parse(red_rf, {symbolize_names: true})

    rf = red_rf ||= create_routing_form(entry, rf_id)

    rf[:pis] |= [person[:user_id]] if entry[:type] == 'Project::RoutingForm::PI'
    rf[:cois] |= [person[:user_id]] if entry[:type] == 'Project::RoutingForm::Investigator'
    rf[:techs] |= [person[:user_id]] if entry[:type] == 'Project::RoutingForm::Technician'

    # If the seqnum already exists then this award money
    # has already been added in, otherwise we need to sum
    # the additional award money
    unless rf[:seqnum].include? entry[:seqnum]
      if rf[:adirect].nil?
        rf[:adirect] = entry[:adirect]
      else
        rf[:adirect] += entry[:adirect].to_f
      end
    end

    if rf[:budgetenddate] && rf[:budgetenddate].instance_of?(String)
      rf[:budgetenddate] = Date.strptime(rf[:budgetenddate].split(' ').first, '%Y-%m-%d')
    end

    budgetenddate = entry[:budgetenddate] ? Date.strptime(entry[:budgetenddate].split(' ').first, '%Y-%m-%d') : nil
    if rf[:budgetenddate].nil? || (rf[:budgetenddate] && budgetenddate && rf[:budgetenddate] < budgetenddate)
       rf[:budgetenddate] = budgetenddate
    end

    if rf[:budgetstartdate] && rf[:budgetstartdate].instance_of?(String)
      rf[:budgetstartdate] = Date.strptime(rf[:budgetstartdate].split(' ').first, '%Y-%m-%d')
    end

    budgetstartdate = entry[:budgetstartdate] ? Date.strptime(entry[:budgetstartdate].split(' ').first, '%Y-%m-%d') : nil
    if rf[:budgetstartdate].nil? || (rf[:budgetstartdate] && budgetstartdate && rf[:budgetstartdate] > budgetstartdate)
       rf[:budgetstartdate] = budgetstartdate
    end

    rf[:seqnum] |= [entry[:seqnum]]

    redis.set("rf:#{rf_id}", rf.to_json)
  end

  cnt = 0
  redis.keys("rf:*").each do |red_key|
    key = red_key.split(":").last
    val = JSON.parse(redis.get(red_key), {symbolize_names: true})

    if val[:adirect] != nil && val[:adirect] > 0 && val[:seqnum].length > 1
      puts 'key: ' + key
      puts val
      cnt += 1
    end
  end
  puts 'cnt: ' + cnt.to_s

  report_time "Creating user to index map"
  map = {}
  k = -1

  redis.keys("person:*").each do |red_key|
    key = red_key.split(":").last.to_i
    map[key] = k += 1
  end

  # now we have nodes and rfs
  # need to compute links from rfs, this will change links to pair-keyed hash entries with user ids being the keys
  # links will have key [source_user_id, target_user_id]
  # fields:
  #  source_user_id, target_user_id, rf_award_value, rf_occurence_count, earliest_occurrence, latest_occurrence

  report_time "Creating RF Links"

  redis.keys("rf:*").each do |red_key|

    rf = JSON.parse(redis.get(red_key), {symbolize_names: true})

    rf[:pis].each do |pi|
      (rf[:cois] + rf[:techs]).each do |other|
        pi_index = map[pi]
        other_index = map[other]

        link = redis.get("link:#{[pi_index, other_index].to_s}")
        if link
          link = JSON.parse(link, {symbolize_names: true})
        end

        unless link
          link = {}
          link[:source] = pi_index
          link[:target] = other_index
          link[:source_user_id] = pi
          link[:target_user_id] = other
          link[:rf_award_value] = 0
          link[:rf_occurrence_count] = 0
        end

        link[:rf_award_value] += rf[:adirect] || 0
        link[:rf_occurrence_count] += 1
        link[:earliest_occurrence] = (rf[:appldate].nil? || (link[:earliest_occurrence] && link[:earliest_occurrence] < rf[:appldate])) ? link[:earliest_occurrence] : rf[:appldate]
        link[:latest_occurrence] = (rf[:appldate].nil? || (link[:latest_occurrence] && link[:latest_occurrence] > rf[:appldate])) ? link[:latest_occurrence] : rf[:appldate]
        link[:latest_occurrence] = (rf[:budgetenddate].nil? || (link[:latest_occurrence] && link[:latest_occurrence] > rf[:budgetenddate])) ? link[:latest_occurrence] : rf[:budgetenddate]
        redis.set("link:#{[pi_index, other_index].to_s}", link.to_json)
      end

    end

  end


  # create a map from pi.user_id to document_id
  documents_map = {}
  document_limit = 1000000

  report_time "Creating corpus for #{map.length} Nodes"
  corpus = []

  # remember the json data from dbvis?  create a corpus from each row with the titles and the summaries
  #
  #@nodes.each  do |_, pi|
  redis.keys("person:*").each do |red_key|
    pi = JSON.parse(redis.get(red_key), {symbolize_names: true})

    content = pi[:titles].join(' ') + pi[:summaries].join(' ')

    content.strip!
    if content && content.length > 0 && documents_map.keys.length < document_limit
      document = TfIdfSimilarity::Document.new(content)
      documents_map[document.id] = pi[:user_id]
      corpus << document
    end
  end

  #NOTE: Between here and the end of the similarity_matrix creation the ruby
  # process spiked to about 4.5GB memory utilization, then
  # dropped down to around 2GB usage after that
  report_time "Creating Similarity Model for #{documents_map.keys.count} Documents"
  # create a term frequency model using the corpus (and use narray to make it faster)
  model = TfIdfSimilarity::TfIdfModel.new(corpus, :library => :narray)

  #calculate the similarity matrix <<<--- slowest part
  report_time "Creating similarity matrix for #{documents_map.keys.count} Documents"
  mat = model.similarity_matrix
#end

min_term_weight = 2.0

report_time "Creating Similarity links"
#convert the matrix into links for the json data
# this is used to reduce the final json size
#
(0..mat.shape[0]-1).each do |i|
   source_node_key = documents_map[model.documents[i].id]
   term_weights = {}
   model.documents[i].terms.each do |term|
     tfidf = model.tfidf(model.documents[i], term)
     term_weights[term] = tfidf if tfidf > min_term_weight
   end

   terms_in_order =  Hash[term_weights.sort_by{|key, value| -1*value }]

   begin
     r0 ||= 5
     node = JSON.parse(redis.get("person:#{source_node_key}"), {symbolize_name: true})
     node[:terms] = terms_in_order
     redis.set("person:#{source_node_key}", node.to_json)
   rescue Redis::TimeoutError
     retry unless (r0 -= 1).zero?
   end

   (0..mat.shape[1]-1).each do |j|
     target_node_key = documents_map[model.documents[j].id]
     #similarity_threshold = 0.1
     #TODO: Set similarity threshold above 0 to screen out some recs
     similarity_threshold = -10.1
     unless mat[i,j] < similarity_threshold || i == j
       link_key = [map[source_node_key],map[target_node_key]]
       link = nil
       begin
         r1 ||= 5
         link = redis.get("link:#{link_key.to_s}")
       rescue Redis::TimeoutError
         retry unless (r1 -= 1).zero?
       end

       link = JSON.parse(link, {symbolize_names: true}) if link

       unless link
         link = {}
         link[:source] = map[source_node_key]
         link[:target] = map[target_node_key]
         link[:source_user_id] = source_node_key
         link[:target_user_id] = target_node_key
         link[:rf_award_value] = 0
         link[:rf_occurrence_count] = 0
       end
       link[:similarity_value] = mat[i,j]
       begin
         r2 ||= 5
         redis.set("link:#{link_key.to_s}", link.to_json)
       rescue Redis::TimeoutError
         retry unless (r1 -= 1).zero?
       end
     end
   end
end

# The following is doing a scan just to get the counts for the output; this is a bit
# time consuming, so it might be better to just leave it out.
people_count = 0
people_idx = 0
begin
  people = redis.scan(people_idx, match: "person:*", count: 100)
  people_idx = people.first
  people_count += people.last.length
end until people_idx == 0

links_count = 0
links_idx = 0
begin
  links = redis.scan(links_idx, match: "link:*", count: 100)
  links_idx = links.first
  links_count += links.last.length
end until links_idx == 0

report_time "Creating content for output file including #{people_count} nodes and #{links_count} links."

# write the content
File.open('combined_occurrence_and_similarity.json','w') do |file|
  file.puts '{"nodes": ['

    keys = []
    people_idx = 0
    begin
      people = redis.scan(people_idx, match: "person:*", count: 100)
      people_idx = people.first
      keys |= people.last
    end until people_idx == 0

    (0...(keys.length)).each do |i|
      node = redis.get(keys[i])

      if(i == keys.length - 1)
        file.puts node
      else
        file.puts node + ','
      end
    end

  file.puts '], "links": ['

    keys = []
    links_idx = 0
    begin
      links = redis.scan(pidx, match: "link:*", count: 100)
      links_idx = links.first
      keys |= links.last
    end until links_idx == 0

    (0...(keys.length)).each do |i|
      link = redis.get(keys[i])

      if(i == keys.length - 1)
        file.puts link
      else
        file.puts link + ','
      end
    end

  file.puts ']}'
end

report_time "Done with everything"
