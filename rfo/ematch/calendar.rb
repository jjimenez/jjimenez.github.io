# to read / write json
require 'json'
require 'byebug'
require 'date'

@start_time = Time.now
@last_interval = @start_time

def report_time(message)
  time_from_start = Time.new(0) + (Time.now - @start_time)
  time_from_interval = Time.new(0) + (Time.now - @last_interval)
  puts "   Now: #{Time.now.strftime('%H:%M:%S.%L')}"
  puts "   From Start: #{time_from_start.strftime('%H:%M:%S.%L')}"
  puts "   From Last Interval: #{time_from_interval.strftime('%H:%M:%S.%L')}"
  puts "Time check (#{message}): "
  @last_interval = Time.now
end


input_file = 'new_adjacency.json'
output_file = '../data/swimlane.json'


# read the dbvisualization data
file = File.read(input_file);

# parse it
data_hash = JSON.parse(file);

# data needs to be in the following format
# { lanes: [ {id: ##, label: SSS}, ...],
#    items: [ {id: ##, desc: SSSS, lane: ##, start: DATE, end: Date, class: SSSS}
# }
# for our purposes, add PI as owner of each lane
# create nodes list for filtering
# label for lane should be Title of project
#    add total dollars to lane
# description for item should be the Sequence #
#    add dollars to item
#    add status (awarded / not awarded) based on dollars



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
@nodes = {}
@copy_keys = ["user_id", "display_name_reverse", "Org", "department", "official_title"]

report_time "Creating Nodes, Lanes, and Items"

def create_person(entry, user_id)
  person = {}
  @copy_keys.each { |key| person[key] = entry[key]}
  @nodes[user_id] = person
end

def create_lane(entry, lane_id)
  lane = {}
  lane["user_id"] = lane_id["user_id"]
  lane["role"] = lane_id["role"]
  lane["label"] = entry["title"]
  lane["seqnum"] = []
  lane["adirect"] = 0
  @lanes[lane_id] = lane
end

def create_item(entry, item_id, lane_id)
  item = {}
  item["item_id"] = item_id
  item["desc"] = entry["seqnum"]
  item["lane_id"] = lane_id
  item["start"] = Date.strptime(entry["budgetstartdate"].split(' ').first, '%Y-%m-%d')
  item["end"] =   Date.strptime(entry["budgetenddate"].split(' ').first, '%Y-%m-%d')
  item["class"] = item["end"] < Date.today ? 'past' : 'future'
  item["awarded"] =  entry["adirect"] > 0
  item["adirect"] = entry["adirect"]
  @items[item_id] = item
end

@lanes = {}
@items = {}

# filter for one pi if value set

single_pi = nil

data_hash.each do |entry|
  
  role = entry["type"].gsub("Project::RoutingForm::","")

  user_id = entry["user_id"]
  next if single_pi && user_id != single_pi
  person = @nodes[user_id] ||= create_person(entry, user_id)

  lane_title = entry["title"]
  lane_id = { "user_id" => user_id, "role" => role, "title" => lane_title }

  lane = @lanes[lane_id] ||= create_lane(entry, lane_id)

  # If the seqnum already exists then this award money
  # has already been added in, otherwise we need to sum
  # the additional award money
  seqnum = entry["seqnum"]
  unless lane["seqnum"].include? seqnum
    lane["adirect"] += entry["adirect"].to_f
  end

  lane["seqnum"] |= [seqnum]

  if (entry["budgetstartdate"] && entry["budgetenddate"]) then
    item_id = lane_id.clone
    item_id["seqnum"] = seqnum
    item = @items[item_id] ||= create_item(entry, item_id, lane_id)
  end

end

# now we have nodes, lanes, and items

# give each lane a numeric id
lane_index = -1
@lanes.each { |key, lane| lane["id"] = lane_index +=1; lane.delete("seqnum")  }

# give each item a numeric id and a lane_id
item_index = -1
@items.each do |key, item|
  item["id"] = item_index +=1; 
  item["lane"] = @lanes[item["lane_id"]]["id"]
  item.delete("item_id"); 
  item.delete("lane_id"); 
end


report_time "Creating content for output file including #{@nodes.keys.count} nodes, #{@lanes.keys.count} lanes, and #{@items.keys.count} items."

# the json content is the colleges, hand coded above, nodes (from dbvisualizer), and the links calculated above
content = '{"nodes": ' + JSON.pretty_generate(@nodes.values, { object_nl: '', space: ''}) + ', "lanes": ' + JSON.pretty_generate(@lanes.values, { object_nl: '', space: ''}) + ', "items": ' + JSON.pretty_generate(@items.values, { object_nl: '', space: ''}) + '}'

# write the content
File.open(output_file,'w') { |f| f.write(content) }

report_time "Done with everything"
