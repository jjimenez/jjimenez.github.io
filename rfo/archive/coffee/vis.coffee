
class BubbleChart
  constructor: (data) ->
    @data = data
    @width = 940
    @height = 600

    @tooltip = CustomTooltip("gates_tooltip", 240)



    # locations the nodes will move towards
    # depending on which view is currently being
    # used
    @center = {x: @width / 2, y: @height / 2}
    @year_centers = {
      "2011": {x: @width / 4, y: @height / 2},
      "2012": {x: 2 * @width / 5, y: @height / 2},
      "2013": {x: 3 * @width / 5, y: @height / 2},
      "2014": {x: 3 * @width / 4, y: @height / 2}
    }

    # used when setting up force and
    # moving around nodes
    @layout_gravity = -0.01
    @damper = 0.1

    # these will be set in create_nodes and create_vis
    @vis = null
    @nodes = []
    @force = null
    @circles = null

    # nice looking colors - no reason to buck the trend
    @fill_color = d3.scale.ordinal()
      .domain(["Non-Federal", "Federal"])
      .range(["#beccae", "#7aa25c"])

    @highlight_color = d3.scale.ordinal()
    .domain(["Department of Health & Human Services", "Business & Corporations"])
    .range([d3.rgb("#beccae").darker(), d3.rgb("#7aa25c").brighter()])

    # use the max total_amount in the data as the max in the scale's domain
    max_amount = d3.max(@data, (d) -> parseInt(d.amount))
    min_amount = d3.min(@data, (d) -> parseInt(d.amount))
    @radius_scale = d3.scale.pow().exponent(0.8).domain([min_amount, max_amount]).range([2, 85])
    min_delta = d3.min(@data, (d) -> parseInt(d.delta))
    max_delta = d3.max(@data, (d) -> parseInt(d.delta))
    @y_scale = d3.scale.pow().exponent(0.3).domain([max_delta, min_delta]).range([ @height / 3, 3 * @height/5])


    this.create_nodes()
    this.create_vis()

  # create node objects from original data
  # that will serve as the data behind each
  # bubble in the vis, then add each node
  # to @nodes to be used later
  create_nodes: () =>
    @data.forEach (d) =>
      node = {
        id: d.id
        radius: @radius_scale(parseInt(d.amount))
        value: d.amount
        source: d.source
        group: d.federal
        year: d.year
        diff: d.delta
        delta: d.delta
        previous: d.previous
        x: Math.random() * 900
        y: @y_scale(parseInt(d.delta))
      }
      @nodes.push node

    @nodes.sort (a,b) -> b.value - a.value



  # create svg at #vis and then
  # create circle representation for each node
  create_vis: () =>
    @vis = d3.select("#vis").append("svg")
      .attr("width", @width)
      .attr("height", @height)
      .attr("id", "svg_vis")

    @circles = @vis.selectAll("circle")
      .data(@nodes, (d) -> d.id)

    # used because we need 'this' in the
    # mouse callbacks
    that = this

    # radius will be set to 0 initially.
    # see transition below
    @circles.enter().append("circle")
      .attr("r", 0)
      .attr("fill", (d) =>
        node_color = @fill_color(d.group)
        node_color = @highlight_color(d.source) if d.source in  @highlight_color.domain()
        node_color
      )
      .attr("stroke-width", 2)
      .attr("stroke", (d) => d3.rgb(@fill_color(d.group)).darker())
      .attr("id", (d) -> "bubble_#{d.id}")
      .on("mouseover", (d,i) -> that.show_details(d,i,this))
      .on("mouseout", (d,i) -> that.hide_details(d,i,this))

    # Fancy transition to make bubbles appear, ending with the
    # correct radius
    @circles.transition().duration(2000).attr("r", (d) -> d.radius)


  # Charge function that is called for each node.
  # Charge is proportional to the diameter of the
  # circle (which is stored in the radius attribute
  # of the circle's associated data.
  # This is done to allow for accurate collision
  # detection with nodes of different sizes.
  # Charge is negative because we want nodes to
  # repel.
  # Dividing by 8 scales down the charge to be
  # appropriate for the visualization dimensions.
  charge: (d) ->
    -Math.pow(d.radius, 2.0) / 8

  # Starts up the force layout with
  # the default values
  start: () =>
    @force = d3.layout.force()
      .nodes(@nodes)
      .size([@width, @height])

  # Sets up force layout to display
  # all nodes in one circle.
  display_group_all: () =>
    @force.gravity(@layout_gravity)
      .charge(this.charge)
      .friction(0.9)
      .on "tick", (e) =>
        @circles.each(this.move_towards_center(e.alpha))
          .attr("cx", (d) -> d.x)
          .attr("cy", (d) -> d.y)
    @force.start()

    this.hide_years()

  # Moves all circles towards the @center
  # of the visualization
  move_towards_center: (alpha) =>
    (d) =>
      new_y = @y_scale(parseInt(d.delta))
      d.x = d.x + (@center.x - d.x) * (@damper + 0.02) * alpha
      d.y = d.y + (new_y - d.y) * (@damper + 0.02) * alpha


  # sets the display of bubbles to be separated
  # into each year. Does this by calling move_towards_year
  display_by_year: () =>
    @force.gravity(@layout_gravity)
      .charge(this.charge)
      .friction(0.9)
      .on "tick", (e) =>
        @circles.each(this.move_towards_year(e.alpha))
          .attr("cx", (d) -> d.x)
          .attr("cy", (d) -> d.y)
    @force.start()

    this.display_years()

  # move all circles to their associated @year_centers
  move_towards_year: (alpha) =>
    (d) =>
      target = @year_centers[d.year]
      new_y = @y_scale(parseInt(d.delta))
      d.x = d.x + (target.x - d.x) * (@damper + 0.02) * alpha * 1.1
      d.y = d.y + (new_y - d.y) * (@damper + 0.02) * alpha * 1.1

  # Method to display year titles
  display_years: () =>
    years_x = {"2011": @width / 8, "2012": 2 * @width / 6, "2013": 3 * @width / 5 , "2014": 5 * @width / 6 }
    years_data = d3.keys(years_x)
    years = @vis.selectAll(".years")
      .data(years_data)

    years.enter().append("text")
      .attr("class", "years")
      .attr("x", (d) => years_x[d] )
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .text((d) -> d)

  # Method to hide year titiles
  hide_years: () =>
    years = @vis.selectAll(".years").remove()

  show_details: (data, i, element) =>
    d3.select(element).attr("stroke", "black")
    value_class = "value"
    value_class += " positive" if data.delta > 0
    value_class += " negative" if data.delta < 0
    content = "<span class=\"name\">Source:</span><span class=\"value\"> #{data.group} - #{data.source}</span><br/>"
    content +="<span class=\"name\">Amount:</span><span class=\"#{value_class}\"> $#{addCommas(data.value)}</span><br/>"
    content +="<span class=\"name\">Previous Year:</span><span class=\"value\"> $#{addCommas(data.previous)}</span><br/>"  if data.year != '2011'
    content += "<span class=\"name\">Change:</span><span class=\"#{value_class}\"> #{data.delta}%</span><br/>" if data.year != '2011'
    content +="<span class=\"name\">Year:</span><span class=\"value\"> #{data.year}</span>"
    @tooltip.showTooltip(content,d3.event)


  hide_details: (data, i, element) =>
    d3.select(element).attr("stroke", (d) => d3.rgb(@fill_color(d.group)).darker())
    @tooltip.hideTooltip()


root = exports ? this

$ ->
  chart = null

  render_vis = (csv) ->
    chart = new BubbleChart csv
    chart.start()
    root.display_all()
  root.display_all = () =>
    chart.display_group_all()
  root.display_year = () =>
    chart.display_by_year()
  root.toggle_view = (view_type) =>
    if view_type == 'year'
      root.display_year()
    else
      root.display_all()

  d3.csv "data/funding_watch.csv", render_vis
