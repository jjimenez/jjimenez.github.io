require 'json'
require 'Set'

require 'byebug'

require 'kmeans/pair'
require 'kmeans/pearson'
require 'kmeans/cluster'
require 'stopwords'


@all_words = Set.new
@cluster_hash = Hash.new
@stop_words = Stopwords::Snowball::Filter.new "en"

@key_attribute = :user_id
#@key_attribute = :contact_pi


@start = Time.now
@step_time = @start
def report_time
  print 'step: ' + (Time.now - @step_time).to_s + ',  '
  @step_time = Time.now
  puts 'elapsed: ' + (Time.now - @start).to_s
end

def read_file
  file = File.read('combined_occurrence_and_similarity.json');
# file = File.read('pi_similarity.json');

  # parse it
  @data_hash = JSON.parse(file, {symbolize_names: true});
end

def node_words(node)
@stop_words.filter   (node[:titles].join(' ').downcase + ' ' + node[:summaries].join(' ').downcase).split

  #@stop_words.filter (node[:pi_titles].downcase+ ' ' + (node[:pi_summaries] || '').downcase).split

end


def setup_words
  @data_hash[:nodes].each do |node|
    @all_words += node_words(node)
  end
end

def make_vector(text)
  new_vector = Hash.new
  @all_words.each do |w|
    new_vector[w] = text.count(w)
  end
  new_vector
end


def setup_hash
  @data_hash[:nodes].each do |node|
    @cluster_hash[node[@key_attribute]] = make_vector(node_words(node))
  end
end


def apply_clustering
 @kmeans = Kmeans::Cluster.new(@cluster_hash,
                               {
                                   :centroids => 22,
                                   :loop_max => 10
                               })
  @kmeans.make_cluster
end

def insert_cluster_index
  @kmeans.cluster.values.each_with_index { |cluster, cluster_index|
    cluster.each do |name|
      node_index = @data_hash[:nodes].index { |node| node[@key_attribute] == name }
      @data_hash[:nodes][node_index][:cluster] = cluster_index
    end
  }
end

def write_file
  File.open('cluster_test.json', 'w') do |file|
    file.write(@data_hash.to_json)
  end

  # File.open('cluster_test.csv','w') do |file|
  #   file.puts('user_id, college, cluster')
  #   @data_hash[@key_attribute].each do |node|
  #     file.puts(%Q{"#{node[@key_attribute]}","#{node[:college]}",#{node[:cluster]}})
  #   end
  # end
end


def main
  report_time
  puts "read file"
  read_file
  report_time
  puts "setup words"
  setup_words
  report_time
  puts "setup hash"
  setup_hash
  report_time
  puts "apply clustering"
  apply_clustering
  report_time
  puts "insert cluster index"
  insert_cluster_index
  report_time
  puts "write file"
  write_file
  report_time
  puts "done"
end



main