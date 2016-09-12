/* jshint undef: false*/

// dates for filtering by time of first collaboration
var latest_link_dates = [
    new Date(2011, 6, 1),
    new Date(2012, 0, 1),
    new Date(2012, 6, 1),
    new Date(2013, 0, 1),
    new Date(2013, 6, 1),
    new Date(2014, 0, 1),
    new Date(2014, 6, 1),
    new Date(2015, 0, 1),
    new Date(2015, 6, 1)
];

// variable declaration
//var primary_filters_selected,
 var all_links = [],
    all_nodes = [],
    display_links = [],
    display_nodes = [],
    primary_filter_mapped = false,
    mapped_primary_filter = [],
    first_link_dte,
    last_link_dte,
    mapped_links = [],
    splines = [],
    allow_time_animation = true,
    clustered_nodes = [],
    clusters = [];

// ranges
var primary_colors = d3.scale.category20();
var opacity_scale = d3.scale.linear().range([0.5,1]).clamp(true);
var charge_scale = d3.scale.linear().domain([100,1400]).range([-20, -1]).clamp(true);
var link_scale = d3.scale.linear().domain([100,1400]).range([40,25]).clamp(true);
var node_size_scale = d3.scale.linear().domain([100,1400]).range([5,35]);
var link_width_scale = d3.scale.pow()
    .range([3, 14]).clamp(true);

/* exported set_domains_by_value */
function set_domains_by_value(min, max){
    opacity_scale.domain([min,max]);
    link_width_scale.domain([min,max]);
    node_size_scale.domain([min,max]);
}


/* exported set_domains_by_count */
function set_domains_by_count(max) {
    charge_scale.domain([charge_scale.domain()[0], max]);
    link_scale.domain([charge_scale.domain()[0], max]);
}


function show_dates(slider_selector, target_selector) {
    var sliders_element = $(slider_selector),
        target_element = $(target_selector);
    sliders = sliders_element.val();
    first_link_dte = latest_link_dates[Math.floor(sliders[0])];
    last_link_dte = latest_link_dates[Math.floor(sliders[1])];
    target_element.text(moment(first_link_dte).format('M/D/YYYY') + " to " +moment(last_link_dte).format('M/D/YYYY') );
}

/* exported set_dates_by_index */
function set_dates_by_index(slider_selector, target_selector, first_date, second_date) {
    first_link_dte  = latest_link_dates[first_date];
    last_link_dte = latest_link_dates[second_date];
    create_date_slider(slider_selector, target_selector, first_date, second_date);
    show_dates(slider_selector, target_selector);
}

function create_date_slider(slider_selector, target_selector, start_index, end_index){

    $(slider_selector).noUiSlider({
        start: [ start_index, end_index ],
        behaviour: 'drag',
        connect: true,
        range: {
            'min':  0,
            'max':  latest_link_dates.length - 1
        },
        step: 1,
        margin: 1
    })
        .change(function() {
            allow_time_animation = false;
            show_dates(slider_selector, target_selector);
            render();
        }
    );
}

// ???: function name isn't meaningful
function add_primary_function_button(text, filter_type) {
    config.selected_filters_container.append("<button class='filter " + filter_type + "'>" + text + "</button>");
}

var clear_filters = function(){
  find_filter("primary").selected = [];
  find_filter("secondary").selected = [];
  config.selected_filters_container.find('button.filter').remove();
};

// Adds filters
function add_filter(event, ui) {
    var filter_type = '';
    allow_time_animation = false;

    var filter = _.filter(config.filters, function(e){ return ui.item.label.match(e.prefix);})[0];
    filter_type = filter.name;

    if(ui.item.value === "All" || _.find(config.filters, function(e){return _.contains(e.selected, "All");})){
      clear_filters();
    }

    if (find_filter(filter_type).selected.indexOf(ui.item.value) === -1) {
       find_filter(filter_type).selected.push(ui.item.value);
        add_primary_function_button(ui.item.label, filter_type);
        render();
    }
    config.primary_filter_input.val('');
    return false;
}

/* exported set_selected_colors */
var set_selected_colors = function(primary_filter_list, primary_key_selector){
    if (typeof(colors_set) === "undefined") {

        //create the right color range
        // TODO: color scale should be setup using color_by
        primary_colors = d3.scale.category20().domain(primary_filter_list);

        colors_set = true;
        var i = 0;

        //fill in the color key
        primary_filter_list.forEach(function (d) {
            mapped_primary_filter[d] = i++;
            if (d.toLowerCase() !== 'all') {
                d3.select(primary_key_selector)
                    .append("li")
                    .text(d)
                    .style("background-color", primary_colors(d));
            }
        });
  }
};

/* exported map_primary_filter */
/* exported map_filters */
function map_filters(filter_list) {
    if (!primary_filter_mapped) {
        primary_filter_mapped = true;

        var autocomplete_source = [];

        // This loops over all filters and maps them into a single array
        // could cause perf problems if there were a high number of filters,
        // but this seems unlikely right now.
        //
        // The passing of filter_list[i] as the final
        // parameter causes the context of `this` to rebind
        // for the function callback.
        for(var i=0; i < filter_list.length; i++){
          autocomplete_source = autocomplete_source.concat(
            filter_list[i].map(function(e){
              return { label: this.obj.prefix + e, value: e};
            }, filter_list[i])
          );
        }

        config.primary_filter_input.autocomplete({
            source: autocomplete_source,
            select: add_filter
        });

        // Removes filter that was clicked
        config.selected_filters_container.on('click', 'button.filter', function (){
            var txt = $(this).text().split(' ');
            var pfx = txt.shift();
            txt = txt.join(' ').trim();

            var matched_filter = _.find(config.filters, function(e){
              return e.prefix.trim() === pfx.trim();
            });
            matched_filter.selected = _.reject(matched_filter.selected, function(e){return e === txt;});

            $(this).remove();
            render();
        });

        find_filter("primary").selected.forEach(function(d) {
            add_primary_function_button(find_filter("primary").prefix + d, 'primary');
        });
    }
}

/* exported map_links */
function map_links(raw_links, raw_nodes) {
    all_links = raw_links;
    all_nodes = raw_nodes;
    raw_links.forEach(function (link) {
        link.source = raw_nodes[link.source];
        link.target = raw_nodes[link.target];
        config.date_fields.forEach(function (field) {link[field] = new Date(link[field]); });
        mapped_links.push(link);
    });
}


// Search filters
/* exported filter_links */
function filter_links(primary_filters, earliest_date, latest_date, keep_nodes, value_limit, secondary_filters, only_matching_nodes, pi_search) {
    var filtered_nodes = {};
    if (typeof(only_matching_nodes) == "undefined"){
      only_matching_nodes = false;
    }
    if (typeof(pi_search) == "undefined"){
        pi_search = false;
    }

    if (pi_search) {
        filtered_links = mapped_links.filter(function(d) {
            match_target  = d.target['pi'] === pi_search;
            match_source = d.source['pi'] === pi_search;
            return match_target || match_source
        });
    } else {
        filtered_links = mapped_links;
    }

    display_links = filtered_links.filter(function (d) {
        //
        var source_match_primary =  primary_filters.indexOf(d.source[find_filter("primary").field]) > -1;
        var target_match_primary = primary_filters.indexOf(d.target[find_filter("primary").field]) > -1;
        var all_primary = primary_filters.indexOf("All") > -1;
        var match_primary_filter = source_match_primary || target_match_primary || all_primary;
        var source_match_secondary = secondary_filters.indexOf(d.source[find_filter("secondary").field]) > -1;
        var target_match_secondary = secondary_filters.indexOf(d.target[find_filter("secondary").field]) > -1;
        var all_secondary = secondary_filters.indexOf("All") > -1;

        var match_secondary_filter = source_match_secondary || target_match_secondary || all_secondary;
        var similarity_significant = typeof(config.significance_value_by) == "undefined" || d[config.significance_value_by] > value_limit;
        var date_match = (earliest_date == null || (d[config.filter_date_field] >= earliest_date)) && (latest_date == null || (d[config.filter_date_field] <= latest_date));
        var is_match =  date_match && (match_primary_filter || match_secondary_filter) && similarity_significant;
        if (is_match) {
            var target_index, source_index;
            target_index = d.target[config.node_id];
            source_index = d.source[config.node_id];
            if (!only_matching_nodes || (only_matching_nodes && (target_match_primary || target_match_secondary || all_primary || all_secondary))){
                filtered_nodes[target_index] = d.target;
            }
            if (!only_matching_nodes || (only_matching_nodes && (source_match_primary || source_match_secondary || all_primary || all_secondary))){
                filtered_nodes[source_index] = d.source;
            }
        }
        return is_match;
    });

    if (keep_nodes) {
        display_nodes = all_nodes;
    } else {
        display_nodes = d3.values(filtered_nodes);
    }

}

/* exported truncate_pi */
function truncate_pi(pi) {
    rval = pi.split(',')[0] + ',';
    rval = rval + pi.split(',')[1][1];
    return rval;
}

/* exported classify_pi */
function classify_pi(pi) {
    rval = pi.split(',')[0] + ',';
    if (pi.split(',').length > 1){
        rval = rval + pi.split(',')[1][1];
    }
    if (rval[rval.length-1] === ',')
    {
        rval = rval.substring(0,rval.length - 1);
    }
    return rval.replace(/[^a-zA-Z]/g, "_").toLowerCase();
}

/* exported create_html_title */
function create_html_title(d, nodes) {
    var title = [];

    title.push('Investigator: ' + nodes[d.x].pi);
    title.push("<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;College: " + nodes[d.x].pi_college);
    title.push("<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Department: " + nodes[d.x].pi_department);
    if (d.x !== d.y) {
        title.push(" <br/><br/>Collaborating with: <br/><br/>");
        title.push("Investigator: " + nodes[d.y].pi);
        title.push(" <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;College: " + nodes[d.y].pi_college);
        title.push("<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Department: " + nodes[d.y].pi_department);
    }
    title.push("<br /><br /> Award Totals: " + numeral(d.z === 1 ? 0 : d.z).format('$0,0'));
    return title.join('');
}

/* exported create_similarity_html_title */
function create_similarity_html_title(d, nodes) {
    var title = [];

    var matching_terms = $.map(nodes[d.x].terms,function(a){return $.inArray(a, nodes[d.y].terms) < 0 ? null : a;});
    var source_terms = nodes[d.x].terms;
    var target_terms = nodes[d.y].terms;

    source_terms = source_terms.map(function (d) {
        if ($.inArray(d, matching_terms) > -1 ) {
            return "<span class='term_highlight'>" + d + "</span>";
        }
        else {
            return d;
        }
    });
    target_terms = target_terms.map(function (d) {
        if ($.inArray(d, matching_terms) > -1) {
            return "<span class='term_highlight'>" + d + "</span>";
        }
        else {
            return d;
        }
    });

    source_terms = source_terms.join(', ');
    target_terms = target_terms.join(', ');

    title.push('Investigator: ' + nodes[d.x].contact_pi);
    title.push("<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;College: " + nodes[d.x].college);
    title.push("<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Terms: " + source_terms);
    if (d.x !== d.y) {
        title.push(" <br/><br/>Similar to: <br/><br/>");
        title.push("Investigator: " + nodes[d.y].contact_pi);
        title.push(" <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;College: " + nodes[d.y].college);
        title.push("<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Terms: " + target_terms);
    } else {
        title.push("<br /><br />Similar Individuals: " + numeral(d.z / 2).format('0,0'));
    }
    title.push("<br /><br />Similarity: " + numeral(d.z).format('0[.]0000'));
    return title.join('');
}

/* exported create_title */
function create_title(d, nodes) {
    var title = [];
    var co_i = d.x === d.y ? '' : "  AND " + nodes[d.y].pi;
    title.push(nodes[d.x].pi + co_i);
    title.push("Award Totals: " + numeral(d.z === 1 ? 0 : d.z).format('$0,0'));
    title.push("(Click cell for more information.)");
    return title.join('\n');
}

/* exported create_similarity_title */
function create_similarity_title(d, nodes) {
    var title = [];
    var co_i = d.x === d.y ? '' : "  AND " + nodes[d.y].contact_pi;
    title.push(nodes[d.x].contact_pi + co_i);
    title.push("Similarity: " + numeral(d.z).format('0[.]0000'));
    title.push("(Click cell for more information.)");
    return title.join('\n');
}

/* exported type_nodes */
function type_nodes(raw_nodes) {
    var typed_nodes= [];
    raw_nodes.forEach(function (d) {
        d.type =  mapped_primary_filter[d[config.primary_filter]];
        if (!clusters[d.type]) {
            clusters[d.type] = d;
        }
        typed_nodes.push(d);
    });
    return typed_nodes;
}

/* exported animate_time */
function animate_time(slider_selector, target_selector, date_interval, time_interval) {
    setTimeout(function() { step_time(slider_selector, target_selector, date_interval, time_interval); }, time_interval);
}


function step_time(slider_selector, target_selector, date_interval, time_interval) {
    var sliders = $(slider_selector).val();
    var first_slider = parseInt(sliders[0]);
    var last_slider = parseInt(sliders[1]);
    if (allow_time_animation && last_slider < 7)
    {
        //first_slider = first_slider + date_interval;
        last_slider = last_slider + date_interval;
        $(slider_selector).val([first_slider, last_slider]);
        show_dates(slider_selector, target_selector);
        render();
        setTimeout(function() { step_time(slider_selector, target_selector, date_interval, time_interval); }, time_interval);
    } else {
        allow_time_animation = false;
    }
}

var find_filter = function(filter){
  return _.find(config.filters, function(e){return e.name === filter;});
};

var get_obj = function(name){
    return _.find(config.filters, function(e){
      if(e.name === name){return e;}
    });
};
