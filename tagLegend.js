var svg = d3.select("#tagLegendSVG");
	svg.selectAll("*").remove();

var colorCategories = d3.schemeSet2.concat(d3.schemeCategory10.concat(d3.schemePaired));
var ThirdOrderColorCategories = colorCategories.slice(0,17);

var colorThird = d3.scaleOrdinal()
	.domain(["Mathematics", "Data Visualization", "Tool Usage", "System/Controller Design", "System Identification", "System Analysis", "Signal Response", "Nyquist-Shannon Sampling Criteria", "Error", "Transforms", "Damping Ratio", "Correlation", "Initial and Final Value Theorem", "Kirchhoff's Current Law", "Kirchhoff's Voltage Law", "System Types", "Transfer Function"])
	.range(ThirdOrderColorCategories);

var legendOrdinal = d3.legendColor()
	.shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
	.shapePadding(10)
	.title("Third Order Tag Groups")
	.scale(colorThird);

var container3 = svg.append("g")
	.attr("class", "legendOrdinal")
	.attr("transform", "translate(0,20)")
	.style("fill", "#000")
	.style("font-size","15px")
	.style("font-family", "Arial");

svg.select(".legendOrdinal")
	.call(legendOrdinal);