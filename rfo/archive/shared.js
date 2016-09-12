// dates for filtering by time of first collaboration
var latest_link_dates = [
    new Date(2011, 6, 1),
    new Date(2012, 0, 1),
    new Date(2012, 6, 1),
    new Date(2013, 0, 1),
    new Date(2013, 6, 1),
    new Date(2014, 0, 1),
    new Date(2014, 6, 1),
    new Date(2015, 0, 1)
];

// variable declaration
var college_selected,
    college_name,
    all_links = [],
    all_nodes = [],
    display_links = [],
    display_nodes = [],
    colleges_mapped = false,
    mapped_colleges = [],
    first_link_dte,
    last_link_dte,
    mapped_links = [],
    splines = [],
    allow_time_animation = true,
    clustered_nodes = [],
    clusters = [];

// ranges
var college_colors = d3.scale.category20();
var opacity_scale = d3.scale.linear().domain([1000000, 30000000]).range([.5,1]).clamp(true);
var charge_scale = d3.scale.linear().domain([0,1400]).range([-30, -10]);
var link_scale = d3.scale.linear().domain([0,1400]).range([40,25]);
var link_width_scale = d3.scale.pow()
    .domain([0, 30000000])
    .range([2, 12]);




function show_dates(slider_selector, target_selector) {
    var sliders_element = $(slider_selector),
        target_element = $(target_selector);
    sliders = sliders_element.val();
    first_link_dte = latest_link_dates[Math.floor(sliders[0])];
    last_link_dte = latest_link_dates[Math.floor(sliders[1])];
    target_element.text(moment(first_link_dte).format('M/D/YYYY') + " to " +moment(last_link_dte).format('M/D/YYYY') );
}

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

function map_colleges(college_list, college_key_selector, college_filter_selector) {
    if (!colleges_mapped) {

        //create the right color range
        college_colors = d3.scale.category20().domain(college_list.map(function (college) {
            return college.college
        }));

        colleges_mapped = true;
        var i = 0;

        //fill in the color key
        college_list.forEach(function (d) {
            mapped_colleges[d.college] = i++;
            if (d.key != 'all') {
                d3.select(college_key_selector)
                    .append("dt")
                    .text(d.college)
                    .append('dd')
                    .text('Investigators')
                    .style("background-color", college_colors(d.college));
            }
        });

        // fill in the college_selector
        d3.select(college_filter_selector)
            .selectAll('option')
            .data(college_list)
            .enter()
            .append('option')
            .attr("value", function (d) {
                return d.key;
            })
            .attr("selected", function (d) {
                return d.key == college_selected ? 'true' : null;
            })
            .text(function (d) {
                return d.college;
            });

        //setup the change event for the college
        d3.select(college_filter_selector).on("change", function () {
            allow_time_animation = false;
            college_selected = this.value;
            college_name = this.selectedOptions.item().text
            render();
        });
    }
}

function map_links(raw_links, raw_nodes) {
    all_links = raw_links;
    all_nodes = raw_nodes;
    raw_links.forEach(function (link) {
        link.source = raw_nodes[link.source];
        link.target = raw_nodes[link.target];
        link.earliest_collaboration = new Date(link.earliest_collaboration);
        mapped_links.push(link);
    });
}



function filter_links(filter_college, earliest_date, latest_date, keep_nodes, value_limit) {
    var filtered_nodes = {};

    display_links = mapped_links.filter(function (d) {
        var match_college = d.source.pi_college == filter_college || d.source.college == filter_college;
        match_college = match_college || d.target.pi_college == filter_college || d.target.college == filter_college;
        match_college = match_college || filter_college.match(/all/i)
        var similarity_significant = d.value > value_limit;
        var date_match = (earliest_date == null || (d.earliest_collaboration >= earliest_date)) && (latest_date == null || (d.earliest_collaboration <= latest_date));
        var is_match =  date_match && match_college && similarity_significant;
        if (is_match) {
            var target_index, source_index;
            target_index = d.target.rank || d.target.contact_pi;
            source_index = d.source.rank || d.source.contact_pi;
            filtered_nodes[target_index] = d.target;
            filtered_nodes[source_index] = d.source;
        }
        return is_match;
    });

    if (keep_nodes) {
        display_nodes = all_nodes;
    } else {
        display_nodes = d3.values(filtered_nodes);
    }

}

function truncate_pi(pi) {
    rval = pi.split(',')[0] + ',';
    rval = rval + pi.split(',')[1][1];
    return rval;
}

function classify_pi(pi) {
    rval = pi.split(',')[0] + ',';
    if (pi.split(',').length > 1){
        rval = rval + pi.split(',')[1][1];
    }
    if (rval[rval.length-1] == ',')
    {
        rval = rval.substring(0,rval.length - 1);
    }
    return rval.replace(/[^a-zA-Z]/g, "_").toLowerCase();
}

function create_html_title(d, nodes) {
    var title = [];

    title.push('Investigator: ' + nodes[d.x].pi);
    title.push("<br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;College: " + nodes[d.x].pi_college);
    title.push("<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Department: " + nodes[d.x].pi_department);
    if (d.x != d.y) {
        title.push(" <br/><br/>Collaborating with: <br/><br/>");
        title.push("Investigator: " + nodes[d.y].pi);
        title.push(" <br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;College: " + nodes[d.y].pi_college);
        title.push("<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Department: " + nodes[d.y].pi_department);
    }
    title.push("<br /><br /> Award Totals: " + numeral(d.z == 1 ? 0 : d.z).format('$0,0'));
    return title.join('');
}

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
    if (d.x != d.y) {
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

function create_title(d, nodes) {
    var title = [];
    var co_i = d.x == d.y ? '' : "  AND " + nodes[d.y].pi;
    title.push(nodes[d.x].pi + co_i);
    title.push("Award Totals: " + numeral(d.z == 1 ? 0 : d.z).format('$0,0'));
    title.push("(Click cell for more information.)");
    return title.join('\n');
}

function create_similarity_title(d, nodes) {
    var title = [];
    var co_i = d.x == d.y ? '' : "  AND " + nodes[d.y].contact_pi;
    title.push(nodes[d.x].contact_pi + co_i);
    title.push("Similarity: " + numeral(d.z).format('0[.]0000'));
    title.push("(Click cell for more information.)");
    return title.join('\n');
}


function type_nodes(raw_nodes) {
    var typed_nodes= [];
    raw_nodes.forEach(function (d) {
        d.type =  mapped_colleges[d.pi_college];
        if (!clusters[d.type]) {
            clusters[d.type] = d;
        }
        typed_nodes.push(d)
    });
    return typed_nodes;
}

function animate_time(slider_selector, target_selector, date_interval, time_interval) {
    setTimeout(function() { step_time(slider_selector, target_selector, date_interval, time_interval); }, time_interval);
}


function step_time(slider_selector, target_selector, date_interval, time_interval) {
    var sliders = $(slider_selector).val();
    var first_slider = parseInt(sliders[0]);
    var last_slider = parseInt(sliders[1]);
    if (allow_time_animation && last_slider < 7)
    {
        first_slider = first_slider + date_interval;
        last_slider = last_slider + date_interval;
        $(slider_selector).val([first_slider, last_slider]);
        show_dates(slider_selector, target_selector);
        render();
        setTimeout(function() { step_time(slider_selector, target_selector, date_interval, time_interval); }, time_interval);
    } else {
        allow_time_animation = false;
    }
}

