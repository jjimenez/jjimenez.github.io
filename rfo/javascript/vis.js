var BubbleChart, root,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

BubbleChart = (function() {
  function BubbleChart(data) {
    this.hide_details = __bind(this.hide_details, this);
    this.show_details = __bind(this.show_details, this);
    this.hide_years = __bind(this.hide_years, this);
    this.display_years = __bind(this.display_years, this);
    this.move_towards_year = __bind(this.move_towards_year, this);
    this.display_by_year = __bind(this.display_by_year, this);
    this.move_towards_center = __bind(this.move_towards_center, this);
    this.display_group_all = __bind(this.display_group_all, this);
    this.start = __bind(this.start, this);
    this.create_vis = __bind(this.create_vis, this);
    this.create_nodes = __bind(this.create_nodes, this);
    var max_amount, max_delta, min_amount, min_delta;
    this.data = data;
    this.width = 940;
    this.height = 600;
    this.tooltip = CustomTooltip("gates_tooltip", 240);
    this.center = {
      x: this.width / 2,
      y: this.height / 2
    };
    this.year_centers = {
      "2011": {
        x: this.width / 4,
        y: this.height / 2
      },
      "2012": {
        x: 2 * this.width / 5,
        y: this.height / 2
      },
      "2013": {
        x: 3 * this.width / 5,
        y: this.height / 2
      },
      "2014": {
        x: 3 * this.width / 4,
        y: this.height / 2
      }
    };
    this.layout_gravity = -0.01;
    this.damper = 0.1;
    this.vis = null;
    this.nodes = [];
    this.force = null;
    this.circles = null;
    this.fill_color = d3.scale.ordinal().domain(["Non-Federal", "Federal"]).range(["#beccae", "#7aa25c"]);
    this.highlight_color = d3.scale.ordinal().domain(["Department of Health & Human Services", "Business & Corporations"]).range([d3.rgb("#beccae").darker(), d3.rgb("#7aa25c").brighter()]);
    max_amount = d3.max(this.data, function(d) {
      return parseInt(d.amount);
    });
    min_amount = d3.min(this.data, function(d) {
      return parseInt(d.amount);
    });
    this.radius_scale = d3.scale.pow().exponent(0.8).domain([min_amount, max_amount]).range([2, 85]);
    min_delta = d3.min(this.data, function(d) {
      return parseInt(d.delta);
    });
    max_delta = d3.max(this.data, function(d) {
      return parseInt(d.delta);
    });
    this.y_scale = d3.scale.pow().exponent(0.3).domain([max_delta, min_delta]).range([this.height / 3, 3 * this.height / 5]);
    this.create_nodes();
    this.create_vis();
  }

  BubbleChart.prototype.create_nodes = function() {
    this.data.forEach((function(_this) {
      return function(d) {
        var node;
        node = {
          id: d.id,
          radius: _this.radius_scale(parseInt(d.amount)),
          value: d.amount,
          source: d.source,
          group: d.federal,
          year: d.year,
          diff: d.delta,
          delta: d.delta,
          previous: d.previous,
          x: Math.random() * 900,
          y: _this.y_scale(parseInt(d.delta))
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
    this.circles.enter().append("circle").attr("r", 0).attr("fill", (function(_this) {
      return function(d) {
        var node_color, _ref;
        node_color = _this.fill_color(d.group);
        if (_ref = d.source, __indexOf.call(_this.highlight_color.domain(), _ref) >= 0) {
          node_color = _this.highlight_color(d.source);
        }
        return node_color;
      };
    })(this)).attr("stroke-width", 2).attr("stroke", (function(_this) {
      return function(d) {
        return d3.rgb(_this.fill_color(d.group)).darker();
      };
    })(this)).attr("id", function(d) {
      return "bubble_" + d.id;
    }).on("mouseover", function(d, i) {
      return that.show_details(d, i, this);
    }).on("mouseout", function(d, i) {
      return that.hide_details(d, i, this);
    });
    return this.circles.transition().duration(2000).attr("r", function(d) {
      return d.radius;
    });
  };

  BubbleChart.prototype.charge = function(d) {
    return -Math.pow(d.radius, 2.0) / 8;
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
        new_y = _this.y_scale(parseInt(d.delta));
        d.x = d.x + (_this.center.x - d.x) * (_this.damper + 0.02) * alpha;
        return d.y = d.y + (new_y - d.y) * (_this.damper + 0.02) * alpha;
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
        new_y = _this.y_scale(parseInt(d.delta));
        d.x = d.x + (target.x - d.x) * (_this.damper + 0.02) * alpha * 1.1;
        return d.y = d.y + (new_y - d.y) * (_this.damper + 0.02) * alpha * 1.1;
      };
    })(this);
  };

  BubbleChart.prototype.display_years = function() {
    var years, years_data, years_x;
    years_x = {
      "2011": this.width / 8,
      "2012": 2 * this.width / 6,
      "2013": 3 * this.width / 5,
      "2014": 5 * this.width / 6
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

  BubbleChart.prototype.hide_years = function() {
    var years;
    return years = this.vis.selectAll(".years").remove();
  };

  BubbleChart.prototype.show_details = function(data, i, element) {
    var content, value_class;
    d3.select(element).attr("stroke", "black");
    value_class = "value";
    if (data.delta > 0) {
      value_class += " positive";
    }
    if (data.delta < 0) {
      value_class += " negative";
    }
    content = "<span class=\"name\">Source:</span><span class=\"value\"> " + data.group + " - " + data.source + "</span><br/>";
    content += "<span class=\"name\">Amount:</span><span class=\"" + value_class + "\"> $" + (addCommas(data.value)) + "</span><br/>";
    if (data.year !== '2011') {
      content += "<span class=\"name\">Previous Year:</span><span class=\"value\"> $" + (addCommas(data.previous)) + "</span><br/>";
    }
    if (data.year !== '2011') {
      content += "<span class=\"name\">Change:</span><span class=\"" + value_class + "\"> " + data.delta + "%</span><br/>";
    }
    content += "<span class=\"name\">Year:</span><span class=\"value\"> " + data.year + "</span>";
    return this.tooltip.showTooltip(content, d3.event);
  };

  BubbleChart.prototype.hide_details = function(data, i, element) {
    d3.select(element).attr("stroke", (function(_this) {
      return function(d) {
        return d3.rgb(_this.fill_color(d.group)).darker();
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
      return chart.display_group_all();
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
  return d3.csv("data/funding_watch.csv", render_vis);
});

