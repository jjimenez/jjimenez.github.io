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
            // are we a pi?
            if (data && data.pi) { node.parent = find("Department: " + data.pi_department, { name: "Department: " + data.pi_department, pi_college: data.pi_college, children: []}); } 
            // are we a department?
            else if (data && data.pi_college) { node.parent = find("College: " + data.pi_college, {name: "College: " + data.pi_college, children: []}); }
            // are we a college?
            else { node.parent = find(''); }
            node.parent.children.push(node);
            node.key = name;
          }
        }
        return node;
      }

      people.forEach(function(d) {
        d.name = d.pi;
        find(d.pi, d);
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
      source_name = source_person.pi;
      target_person = people[d.target];
      target_name = target_person.pi;
      mapped.push({source: map[people[d.source].pi], target: map[people[d.target].pi]});
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
              mapped.push({source: map[d.source.pi], target: map[d.target.pi], value: d.value});
          });

          return mapped;
      }


  };
})();

