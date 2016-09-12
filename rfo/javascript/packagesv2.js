(function() {
  packages = {

    // Lazily construct the package hierarchy from class names.
    root: function(people) {
      var map = {};

      function find(name, data) {
        var node = map[name], i;
        if (!node) {
          node = map[name] = data || {name: name, children: []};
          if (name.length) {
            // are we a base_node?
            if (data && data[config.node_label]) {
                var new_node = { name: find_filter("secondary").prefix + data[find_filter("secondary").field], children: []};
                new_node[find_filter("primary").field] = data[find_filter("primary").field];
                node.parent = find(find_filter("secondary").prefix + data[find_filter("secondary").field], new_node);
            }
            // are we a secondary_filter_node?
            else if (data && data[find_filter("primary").field]) { node.parent = find(find_filter("primary").prefix + data[find_filter("primary").field], {name: find_filter("primary").prefix + data[find_filter("primary").field], children: []}); }
            else { node.parent = find(''); }
            node.parent.children.push(node);
            node.key = name;
          }
        }
        return node;
      }

      people.forEach(function(d) {
        d.name = d[config.node_label];
        find(d[config.node_label], d);
      });

      return map[""];
    },

    map_links: function(nodes, people, links) {

    var map = {},
        mapped = [];

    function deep_map(node) {
      map[node.name] = node;
      if (node.children) {
        node.children.forEach(function (child) { deep_map(child); } );
      }
    }
    nodes.forEach(function (d) {
      deep_map(d);
    });

    links.forEach(function (d) {
      source_person = people[d.source];
      source_name = source_person[config.node_label];
      target_person = people[d.target];
      target_name = target_person[config.node_label];
      mapped.push({source: map[people[d.source][config.node_label]], target: map[people[d.target][config.node_label]]});
    });

    return mapped;
    },
      map_ancestry: function(nodes, people, links) {

          var map = {},
              mapped = [];

          function deep_map(node) {
              map[node.name] = node;
              if (node.children) {
                  node.children.forEach(function (child) { deep_map(child); } );
              }
          }
          nodes.forEach(function (d) {
              deep_map(d);
          });

          links.forEach(function (d) {
              mapped.push({source: map[d.source[config.node_label]], target: map[d.target[config.node_label]], value: d[config.value_by]});
          });

          return mapped;
      }


  };
})();

