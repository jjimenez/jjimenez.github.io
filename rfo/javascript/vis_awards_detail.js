var BubbleChart, root,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

BubbleChart = (function() {
  function BubbleChart(data) {
    this.start = __bind(this.start, this);
    this.create_infovis = __bind(this.create_infovis, this);
    this.create_nodes = __bind(this.create_nodes, this);
    this.data = data;
    this.nodes = [];
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
    this.fill_color = d3.scale.category20b().domain(this.colleges);
    this.create_nodes();
    var colors = this.fill_color;
    this.colleges.forEach(function(d) {
      if (d != "") {
        $("#colors ul").append("<li class=\"color_label\" style=\"background-color:" + colors(d) + "\">" + d + "</li>");
      }
    });

    this.create_infovis();

  }

  BubbleChart.prototype.create_infovis = function() {
    var last_year = this.nodes[0].year;
    var last_range = this.nodes[0].award_range;
    var last_group = this.nodes[0].group;
    var current_count = 0;
    this.nodes.forEach((function(_this) {
      return function(d){
        current_count = current_count + 1;
        if (current_count == 5 || last_range > 3) {
          current_count = 0;
          $('#FY_' + last_year + ' .R' + last_range)
              .append("<span class=\"" + last_group.replace(/ /g,'') + "\" style=\"background-color:" + _this.fill_color(last_group) + "\"> $ </span>")

        }
          //if (last_group != d.group || last_year != d.year ||last_range != d.award_range) {
          //  $('#FY_' + last_year + ' .R' + last_range).append("<br />");
          //
          //}

          last_year = d.year;
          last_range = d.award_range;
          last_group = d.group;

      };
      return true;
    })(this));
    return true;
  };


  BubbleChart.prototype.create_nodes = function() {
    this.data.forEach((function(_this) {
      return function(d) {
        var node;
        node = {
          id: d.dsp_item_id,
          value: d.award_total,
          dollars: d.award_total_dollars,
          group: d.college,
          year: d.fiscal_year,
          award_range: d.award_range
        };
        return _this.nodes.push(node);
      };
    })(this));
    return this.nodes.sort(
        sort_by('year', {name: 'award_range', reverse: 'true'}, 'group')
    );
  };

  return BubbleChart;

})();

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
  var chart, render_vis;
  chart = null;
  render_vis = function(csv) {
    chart = new BubbleChart(csv);
  };
  return d3.tsv("data/fy11_to_fy15_awards.csv", render_vis);
});

var sort_by;

(function() {
  // utility functions
  var default_cmp = function(a, b) {
        if (a == b) return 0;
        return a < b ? -1 : 1;
      },
      getCmpFunc = function(primer, reverse) {
        var dfc = default_cmp, // closer in scope
            cmp = default_cmp;
        if (primer) {
          cmp = function(a, b) {
            return dfc(primer(a), primer(b));
          };
        }
        if (reverse) {
          return function(a, b) {
            return -1 * cmp(a, b);
          };
        }
        return cmp;
      };

  // actual implementation
  sort_by = function() {
    var fields = [],
        n_fields = arguments.length,
        field, name, reverse, cmp;

    // preprocess sorting options
    for (var i = 0; i < n_fields; i++) {
      field = arguments[i];
      if (typeof field === 'string') {
        name = field;
        cmp = default_cmp;
      }
      else {
        name = field.name;
        cmp = getCmpFunc(field.primer, field.reverse);
      }
      fields.push({
        name: name,
        cmp: cmp
      });
    }

    // final comparison function
    return function(A, B) {
      var a, b, name, result;
      for (var i = 0; i < n_fields; i++) {
        result = 0;
        field = fields[i];
        name = field.name;

        result = field.cmp(A[name], B[name]);
        if (result !== 0) break;
      }
      return result;
    }
  }
}());