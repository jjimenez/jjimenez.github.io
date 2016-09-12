var BubbleChart, root,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

BubbleChart = (function() {
  function BubbleChart(data) {
    this.hide_details = __bind(this.hide_details, this);
    this.show_details = __bind(this.show_details, this);
    this.hide_years = __bind(this.hide_years, this);
    this.display_years = __bind(this.display_years, this);
    this.display_ranges = __bind(this.display_ranges, this);
    this.move_towards_year = __bind(this.move_towards_year, this);
    this.display_by_year = __bind(this.display_by_year, this);
    this.move_towards_center = __bind(this.move_towards_center, this);
    this.display_group_all = __bind(this.display_group_all, this);
    this.start = __bind(this.start, this);
    this.create_vis = __bind(this.create_vis, this);
    this.create_nodes = __bind(this.create_nodes, this);
    var max_amount;
    this.data = data;
    this.width = 940;
    this.height = 600;
    this.tooltip = CustomTooltip("gates_tooltip", 240);
    this.center = {
      x: this.width / 2,
      multi_y: [0,7 * Math.floor(this.height / 10),
                Math.floor(6 * this.height / 10),
                Math.floor(5 * this.height / 10),
                Math.floor(4 * this.height / 10),
                Math.floor(3 * this.height / 10)
               ],
      y: this.height / 2
    };
    this.year_centers = {
      "2011": {
        x: 2 * this.width / 7,
        y: this.height / 2
      },
      "2012": {
        x: 3 * this.width / 7,
        y: this.height / 2
      },
      "2013": {
        x: 4 * this.width / 7,
        y: this.height / 2
      },
      "2014": {
        x: 5 * this.width / 7,
        y: this.height / 2
      },
      "2015": {
        x: 6 * this.width / 7,
        y: this.height / 2
      }
    };
    this.layout_gravity = 0.01;
    this.damper = 0.1;
    this.vis = null;
    this.nodes = [];
    this.force = null;
    this.circles = null;
    this.colleges = ['',
      'Business Administration',
      'Dentistry',
      'Education',
      'Engineering',
      'Graduate College',
      'Law',
      'Liberal Arts and Sciences',
      'Medicine',
      'Nursing',
      'Other Administrative Units',
      'Pharmacy',
      'Public Health'];
    this.ranges =  ["",
      "< $10,000",
      "< $100,000",
      "< $1,000,000",
      "< $10,000,000",
      "> $10,000,000"
    ];
    this.fill_color = d3.scale.category20c().domain(this.colleges);
    this.highlight_color = d3.scale.ordinal().domain(["Department of Health & Human Services", "Business & Corporations"]).range([d3.rgb("#beccae").darker(), d3.rgb("#7aa25c").brighter()]);
    max_amount = d3.max(this.data, function(d) {
      return parseInt(d.award_total);
    });
    min_amount = d3.min(this.data, function(d) {
      return parseInt(d.award_total);
    });
    this.radius_scale = d3.scale.pow().exponent(2).domain([min_amount, max_amount]).range([7, 30]);
    this.y_scale = d3.scale.ordinal().domain([5,4,3,2,1]).range(this.center.multi_y);
    this.create_nodes();
    this.create_vis();
    this.display_ranges();
    var colors = this.fill_color;
    $("#colors ul")
        .append("<li class=\"color_label\" style=\"background-color: black; color: white\">All</li>");
    this.colleges.forEach(function(d) {
      if (d != "") {
        $("#colors ul")
            .append("<li class=\"color_label\" style=\"background-color:" + colors(d) + "\">" + d + "</li>");
      }
    });
    $(".color_label").click(function() {
          if ($(this).text() == 'All') {
            $('circle').show();
          } else {
            $('circle').show().not('.' + $(this).text().replace(/ /g, "")).hide();
          }
        });


  }

  BubbleChart.prototype.create_nodes = function() {
    this.data.forEach((function(_this) {
      return function(d) {
        var node;
        node = {
          id: d.dsp_item_id,
          radius: _this.radius_scale(parseInt(d.award_total)),
          value: d.award_total,
          dollars: d.award_total_dollars,
          group: d.college,
          year: d.fiscal_year,
          x: Math.random() * 900,
          y: _this.y_scale(parseInt(d.award_range)),
          award_range: d.award_range,
          change: d.change
        };
        return _this.nodes.push(node);
      };
    })(this));
    return this.nodes.sort(function(a, b) {
      return b.value - a.value;
    });
  };

  BubbleChart.prototype.create_vis = function() {
    var that;
    this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
    this.circles = this.vis.selectAll("circle").data(this.nodes, function(d) {
      return d.id;
    });
    that = this;
    elemEnter = this.circles.enter();
    elemEnter.append("circle").attr("r", 0).attr("fill", (function(_this) {
      return function(d) {
        var node_color, _ref;
        node_color = _this.fill_color(d.group);
        return node_color;
      };
    })(this))
        .attr("stroke-width", 4)
        .style("stroke-dasharray",(function(_this) {
          return function(d) {
            var dasharray;
            dasharray = ("")
            //if (d.change < 0) { dasharray = ("5,2");}
            //else {dasharray = ("");}
            return dasharray;
          }
        })(this))
        .attr("stroke", (function(_this) {
      return function(d) {
        var stroke_color;
        if (d.year == '2011') { stroke_color = 'white';}
        else if (d.change > 0) { stroke_color = 'green';}
        else if (d.change < 0) { stroke_color = 'red';}
        else { stroke_color = 'white';}
        return stroke_color;
      };
    })(this)).attr("id", function(_this) {
          return function(d) {
            return "bubble_" + d.id;
          }
        }(this)).attr("class", function(_this) {
          return function(d) {
            return d.group.replace(/ /g,"");
          }
        }(this))
        .on("mouseover", function(d, i) {
      return that.show_details(d, i, this);
    }).on("mouseout", function(d, i) {
      return that.hide_details(d, i, this);
    });

    return this.circles.transition().duration(2000).attr("r", function(d) {
      return d.radius;
    });
  };



  BubbleChart.prototype.charge = function(d) {
    return -Math.pow(d.radius,1.5);
  };

  BubbleChart.prototype.start = function() {
    return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
  };

  BubbleChart.prototype.display_group_all = function() {
    this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
      return function(e) {
        return _this.circles.each(_this.move_towards_center(e.alpha)).attr("cx", function(d) {
          return d.x;
        }).attr("cy", function(d) {
          return d.y;
        });
      };
    })(this));
    this.force.start();
    return this.hide_years();
  };

  BubbleChart.prototype.move_towards_center = function(alpha) {
    return (function(_this) {
      return function(d) {
        var new_y;
        new_y =_this.center.multi_y[d.award_range];
        d.x = d.x + (_this.center.x - d.x) * (_this.damper + 0.02) * alpha;
        return d.y = d.y + (new_y - d.y) * (_this.damper + 0.02) * alpha * 1.1;
      };
    })(this);
  };

  BubbleChart.prototype.display_by_year = function() {
    this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
      return function(e) {
        return _this.circles.each(_this.move_towards_year(e.alpha)).attr("cx", function(d) {
          return d.x;
        }).attr("cy", function(d) {
          return d.y;
        });
      };
    })(this));
    this.force.start();
    return this.display_years();
  };

  BubbleChart.prototype.move_towards_year = function(alpha) {
    return (function(_this) {
      return function(d) {
        var new_y, target;
        target = _this.year_centers[d.year];
        if (typeof(target) == "undefined") {alert(d.year);}
        new_y = _this.center.multi_y[d.award_range];
        d.x = d.x + (target.x - d.x) * (_this.damper + 0.02) * alpha * 1.1;
        return d.y = d.y + (new_y - d.y) * (_this.damper + 0.02) * alpha * 1.1;
      };
    })(this);
  };

  BubbleChart.prototype.display_years = function() {
    var years, years_data, years_x;
    years_x = {
      "2011": 2 * this.width / 7,
      "2012": 3 * this.width / 7,
      "2013": 4 * this.width / 7,
      "2014": 5 * this.width / 7,
      "2015": 6 * this.width / 7
    };
    years_data = d3.keys(years_x);
    years = this.vis.selectAll(".years").data(years_data);
    return years.enter().append("text").attr("class", "years").attr("x", (function(_this) {
      return function(d) {
        return years_x[d];
      };
    })(this)).attr("y", 40).attr("text-anchor", "middle").text(function(d) {
      return d;
    });
  };

  BubbleChart.prototype.display_ranges = function() {
    var ranges, range_data, ranges_y;
    var offset = -10;
    var positions = [0,8 * Math.floor(this.height / 10),
      Math.floor(6.5 * this.height / 10),
      Math.floor(5 * this.height / 10),
      Math.floor(3.5 * this.height / 10),
      Math.floor(2.5 * this.height / 10)
    ],
    ranges_y = {
      "> $10,000,000": positions[5]  + offset,
      "< $10,000,000": positions[4]  + offset,
      "< $1,000,000": positions[3]  + offset ,
      "< $100,000": positions[2]  + offset,
      "< $10,000": positions[1] + offset
    };
    ranges_data = d3.keys(ranges_y);
    ranges = this.vis.selectAll(".ranges").data(ranges_data);
    return ranges.enter().append("text").attr("class", "ranges").attr("y", (function(_this) {
      return function(d) {
        return ranges_y[d];
      };
    })(this)).attr("x", 20).attr("text-anchor", "right").text(function(d) {
      return d;
    });
  };

  BubbleChart.prototype.hide_years = function() {
    var years;
    return years = this.vis.selectAll(".years").remove();
  };

  BubbleChart.prototype.show_details = function(data, i, element) {
    var content, value_class;
    d3.select(element).attr("stroke", "black");
    content = '';
    content += "<span class=\"name\">Year:</span><span class=\"value\"> " + data.year + "</span><br/>";
    content += "<span class=\"name\">Range:</span><span class=\"value\"> " + (this.ranges[data.award_range]) + "</span><br/>";
    content += "<span class=\"name\">College:</span><span class=\"value\"> " + data.group  + "</span><br/>";
    content += "<span class=\"name\">Count of Awards:</span><span class=\"value\"> " + addCommas(data.value) + "</span><br/>";
    if (data.year != '2011') {
      content += "<span class=\"name\">Change from Last Year:</span><span class=\"value\"> " + addCommas(data.change) + "</span><br/>";
    }
    content += "<span class=\"name\">Total Dollars:</span><span class=\"value\"> $" + (addCommas(data.dollars)) + "</span><br/>";
    return this.tooltip.showTooltip(content, d3.event);
  };

  BubbleChart.prototype.hide_details = function(data, i, element) {
    d3.select(element).attr("stroke", (function(_this) {
      return function(d) {
        var stroke_color;
        if (d.year == '2011') { stroke_color = 'white';}
        else if (d.change > 0) { stroke_color = 'green';}
        else if (d.change < 0) { stroke_color = 'red';}
        else { stroke_color = 'white';}
        return stroke_color;
      };
    })(this));
    return this.tooltip.hideTooltip();
  };

  return BubbleChart;

})();

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
  var chart, render_vis;
  chart = null;
  render_vis = function(csv) {
    chart = new BubbleChart(csv);
    chart.start();
    return root.display_all();
  };
  root.display_all = (function(_this) {
    return function() {
      return chart.display_by_year();
    };
  })(this);
  root.display_year = (function(_this) {
    return function() {
      return chart.display_by_year();
    };
  })(this);
  root.toggle_view = (function(_this) {
    return function(view_type) {
      if (view_type === 'year') {
        return root.display_year();
      } else {
        return root.display_all();
      }
    };
  })(this);
  return d3.tsv("data/fy11_to_fy15_awards_grouped.csv", render_vis);
});

