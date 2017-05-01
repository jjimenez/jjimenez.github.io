
var mainChartWidth = 1000;
var chartRightMargin = 500;
var legendOffset = 400;
var svg = dimple.newSvg("#chartContainer", mainChartWidth, 600);
var secondSvg = dimple.newSvg("#secondChartContainer", mainChartWidth * (1/8)+150, 600);
var data_file = "data/provost_{file}.tsv";
var mainSlicer = "classification";
var pies;
var lines;
var zoomTo = 'year';
var myYAxis;
var overlayChart;
var newSlicerFilters = [];

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

queries = getUrlVars();

file_param = 'student_level';

if (queries["file"])
    file_param = queries["file"];

data_file = data_file.replace("{file}", file_param);

$('a#'+file_param).parent('li').addClass('active');


function addSeries(chart) {
    pies = chart.addSeries(slicer, dimple.plot.pie);
    lines = chart.addSeries(mainSlicer, dimple.plot.line);
    lines.lineMarkers = true;
    lines.lineWeight = 5;
    pies.radius = 20;
    pies.innerRadius = "65%";
}

function clearChart() {
    svg.selectAll("*").remove();
}

function showPie(e, data, colors) {

    secondSvg.selectAll('*').remove();
    var zoomers = e.selectedShape.data()[0].pieKey.split('___').slice(1, 2)[0].split('/');
    var filterYear = zoomers.slice(0,1);
    var filterMain = zoomers.slice(1,2);

    var newData = dimple.filterData(dimple.filterData(data, mainSlicer, filterMain), zoomTo, filterYear);
    if (newSlicerFilters.length > 0) {
        newData = dimple.filterData(newData, slicer, newSlicerFilters);
    }
    overlayChart = new dimple.chart(secondSvg,newData);
    overlayChart.setBounds(0, 15, mainChartWidth * (1 / 6), 500);
    var xAxis = overlayChart.addCategoryAxis('x', 'year');
    xAxis.hidden = true;
    xAxis.showGridlines = false;
    var yAxis = overlayChart.addMeasureAxis('y', "head count");
    yAxis.showGridlines = false;
    yAxis.hidden = true;
    overlayChart.addMeasureAxis("z", "head count");
    var bigPie = overlayChart.addSeries(slicer, dimple.plot.bar);
    bigPie.innerRadius = "50%";
    overlayChart._assignedColors = colors;
    overlayChart.draw();
    $('#zoomText').html(zoomers.slice(1,2) + "<br/>For Year: " + zoomers.slice(0,1));

}


function createChart() {
    d3.tsv(data_file, function (data) {
        data_attributes = Object.getOwnPropertyNames(data[0]);
        ['year', 'head count', mainSlicer].forEach(function (f) {
            data_attributes.splice(data_attributes.indexOf(f), 1);
        });
        slicer = data_attributes[0];
        var myChart = new dimple.chart(svg, data);
        myChart.setBounds(60, 30, mainChartWidth - chartRightMargin, 550)
        var x = myChart.addCategoryAxis("x", ["year", mainSlicer]);
        x.addOrderRule("year");
        myYAxis = myChart.addMeasureAxis("y", "head count");
        myChart.addMeasureAxis("p", "head count");
        addSeries(myChart);
        pies.addEventHandler('click', function(e) {
            showPie(e, myChart.data, myChart._assignedColors);
        });
        var myClassificationLegend = myChart.addLegend(mainChartWidth - legendOffset , 200, 150, 400, "left", lines);
        var mySlicerLegend = myChart.addLegend(mainChartWidth - legendOffset + 225 , 200, 150, 400, "left", pies);

        myChart.draw();

        myChart.legends = [];

        // This block simply adds the legend title. I put it into a d3 data
        // object to split it onto 2 lines.  This technique works with any
        // number of lines, it isn't dimple specific.
        svg.selectAll("title_text")
            .data(["Click legend to", "show/hide segments:"])
            .enter()
            .append("text")
            .attr("x", mainChartWidth - legendOffset)
            .attr("y", function (d, i) {
                return 160 + i * 14;
            })
            .style("font-family", "sans-serif")
            .style("font-size", "10px")
            .style('font-weight', 'bold')
            .style("color", "Black")
            .text(function (d) {
                return d;
            });

        var swapText =
        svg.selectAll("swap_text")
            .data(["Click here to swap",slicer + " and " + mainSlicer +"."])
            .enter().append('g')
            .attr('class', 'swap_text');
        swapText
            .append('rect')
            .attr('x', mainChartWidth - 430)
            .attr('y', 60)
            .attr('width', 300)
            .attr('height', 45)
            .attr('rx', 10)
            .attr('style', 'fill:rgb(0,0,255);stroke-width:3;stroke:rgb(0,0,0);fill-opacity:0.1;stroke-opacity:0.7');
        swapText
            .append("text")
            .attr("x", mainChartWidth - 400)
            .attr("y", function (d, i) {
                return 80 + i * 14;
            })
            .style("font-family", "sans-serif")
            .style("font-size", "10px")
            .style('font-weight', 'bold')
            .style("color", "Black")
            .text(function (d) {
                return d;
            });
        swapText
            .append("path")
            .attr("d", function (d) {
                return "M13.901 2.599c-1.463-1.597-3.565-2.599-5.901-2.599-4.418 0-8 3.582-8 8h1.5c0-3.59 2.91-6.5 6.5-6.5 1.922 0 3.649 0.835 4.839 2.161l-2.339 2.339h5.5v-5.5l-2.099 2.099z";
            })
            .attr("transform", "translate(" + (mainChartWidth - 420) + "," + 75 + ")");
        swapText
            .append("path")
            .attr("d", function (d) {
                return "M14.5 8c0 3.59-2.91 6.5-6.5 6.5-1.922 0-3.649-0.835-4.839-2.161l2.339-2.339h-5.5v5.5l2.099-2.099c1.463 1.597 3.565 2.599 5.901 2.599 4.418 0 8-3.582 8-8h-1.5z";
            })
            .attr("transform", "translate(" + (mainChartWidth - 420) + "," + 75 + ")");
        swapText
            .on('click', function() {
                mainSlicer = slicer;
                clearChart();
                createChart();
            });

        var classFilterValues = dimple.getUniqueValues(data, mainSlicer);
        var slicerFilterValues = dimple.getUniqueValues(data, slicer);
        var hiddenValues = [];

        legendBits = myClassificationLegend.shapes;
        legendBits[0] = legendBits[0]
            .concat(mySlicerLegend.shapes[0]);

        legendBits.selectAll('*')
            // Add a click event to each rectangle
            .on("click", function (e) {
                // This indicates whether the item is already visible or not
                var hide = false;
                var newClassificationFilters = [];
                newSlicerFilters = [];
                var currentValue = e.aggField.slice(-1)[0];

                // If the filters contain the clicked shape hide it
                var whereIsIt = hiddenValues.indexOf(currentValue);
                if (whereIsIt > -1) {
                    //it is hidden and needs to be shown.
                    hide = false;
                    hiddenValues.splice(whereIsIt, 1);
                } else {
                    //it needs to be hidden
                    hide = true;
                    hiddenValues.push(currentValue);
                }


                classFilterValues.forEach(function (f) {
                    if (hiddenValues.indexOf(f) < 0) {
                        newClassificationFilters.push(f);
                    }
                });
                slicerFilterValues.forEach(function (f) {
                    if (hiddenValues.indexOf(f) < 0) {
                        newSlicerFilters.push(f);
                    }
                });
                // Hide the shape or show it
                if (hide) {
                    d3.select(this).style("opacity", 0.2);
                } else {
                    d3.select(this).style("opacity", 0.8);
                }

                // Filter the data
                myChart.data = dimple.filterData(dimple.filterData(data, mainSlicer, newClassificationFilters), slicer, newSlicerFilters);
                // Passing a duration parameter makes the chart animate. Without
                // it there is no transition

                myChart.draw(800, false);

            });


    });
}

function moveLegend(legend, offset) {
    $(legend).find('text,rect').attr('y',parseInt($(f).find('text').attr('y')) + offset);
}

createChart();