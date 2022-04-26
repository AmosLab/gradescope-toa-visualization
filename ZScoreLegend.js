var svg = d3.select("#zLegendSVG");
svg.selectAll("*").remove();

var sequentialScale = d3.scaleSequential(d3.interpolateRdYlGn)
	.domain([0,1]);

var znumbering = [];
var zmin = -2.0;
var zmax = 2.0;	
for (i = zmin; i <= zmax; i += (zmax - zmin)/10) {
	if (i.toFixed(1).toString() === "-0.0") {
		znumbering[znumbering.length]= "0.0";
	}
	else {
		znumbering[znumbering.length]= i.toFixed(1).toString();
	}
}

var legendSequential = d3.legendColor()
	.shapeWidth(50)
	.cells(11)
	.orient('horizontal')
	.title("Z-score colors: (black indicates no data)")
	.titleWidth(300)
	.labels(znumbering)
	.scale(sequentialScale);

var container2 = svg.append("g")
	.attr("class", "legendSequential")
	.attr("transform", "translate(10,15)")
		.style("fill", "#000")
	.style("font-size","15px")
	.style("font-family", "Arial");

svg.select(".legendSequential")
	.call(legendSequential);