//	window sizing
var width = getWidth() - 40,
	height = getHeight() - 30;

// get color categories from d3 color scheme
var colorCategories = d3.schemeSet2.concat(d3.schemeCategory10.concat(d3.schemePaired));

// directory paths to JSON files student data
var student1 = "Student1.json";
var student2 = "Student2.json";

// set initial values for graph
var activeFile = student1;
var activeStroke = 1;
var activeIntersection = 1;

function loadNetwork(studentJSON){
    d3.json(studentJSON).then(function(graph) {
    // initialize label arrays
	var label = {
        'nodes': [],
        'links': [],
        'links2': []
    };
    
	// duplicate nodes from graph to create floating label nodes
    graph.nodes.forEach(function(d, i) {
        label.nodes.push({node: d});
        label.nodes.push({node: d});
        label.links.push({
            source: i * 2,
            target: i * 2 + 1
        });
    });
    
	// Create D3 force-directed graph for labels
    var labelLayout = d3.forceSimulation(label.nodes)
		// simulate force of repulsion between label nodes
        .force("charge", d3.forceManyBody().strength(-200))
		// simulate force of attraction between invisible label nodes and tag nodes
        .force("link", d3.forceLink(label.links).distance(0).strength(3));

	// Create D3 force-directed graph for tags
    var graphLayout = d3.forceSimulation(graph.nodes)
		// simulate force of repulsion between tag nodes
        .force("charge", d3.forceManyBody().strength(-300))
		// simulate force of attraction to center of visualization
        .force("center", d3.forceCenter(width / 2, height / 2))
		// simulate force of attraction between tags that are hierarchically related in the concept map
        .force("link", d3.forceLink(graph.links).id(function(d) {return d.id; }).distance(20).strength(0.2))
        .on("tick", ticked)
		// simulate force of attraction between tags that intersect on questions
        .force("link2", d3.forceLink(graph.links2).id(function(d) {return d.id; }).distance(60).strength(0.03))
        .on("tick", ticked);

	// Toggle intersection force between tag nodes
	var force_button = d3.select("#changeIntersectionForce").on("click", function toggleIntersection(event){
		// Change button text and set value (1 = with intersection force, 0 = no intersection force)
		if (activeIntersection == null) {
			activeIntersection = 1;
			this.innerHTML = "Remove tag intersection";
		}
		if (activeIntersection == 1) {
			this.innerHTML = "Show tag intersection";
			activeIntersection = 0;			
		}
		else if (activeIntersection == 0) {
			this.innerHTML = "Remove tag intersection";
			activeIntersection = 1;
		}
		// Apply new intersection force setting
		graphLayout.force("link2").strength(0.03 * activeIntersection);
		graphLayout.alpha(1).restart();
		console.log("Force interaction toggled to " + activeIntersection);
	});

    var adjlist = [];
    // Find nodes that are adjacent in the visualization
    graph.links.forEach(function(d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });
    graph.links2.forEach(function(d) {
        adjlist[d.source.index + "-" + d.target.index] = true;
        adjlist[d.target.index + "-" + d.source.index] = true;
    });
	
    // Return true if 2 given nodes are adjacent
    function neigh(a, b) {
        return a == b || adjlist[a + "-" + b];
    }
	
    // creates svg container in the viz svg element to draw network visualization elements
    var svg = d3.select("#viz").attr("width", width).attr("height", height);
    var container = svg.append("g");
	
    // uses mouse scroll wheel as zoom function to scale the svg container
    svg.call(
        d3.zoom()
            .scaleExtent([.1, 4])
            .on("zoom", function() { container.attr("transform", d3.event.transform); })
    );
    // tag link stylization
    var link = container.append("g").attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke", "#bbb")
        .attr("stroke-width", "3px");
    
    var link2 = container.append("g").attr("class", "links")
        .selectAll("line")
        .data(graph.links2)
        .enter()
        .append("line")
        .attr("stroke", "#bbb")
        .attr("stroke-width", "0px");
		
    // tag node stylization
    var node = container.append("g").attr("class", "nodes")  
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", 10)
		// node fill color is function of z-score for that tag
        .attr("fill", function(d) {
			if (d.score != -1)
			{
				return d3.color(d3.interpolateRdYlGn(d.score)).formatHex();
			}
			else
			{
				return "#000";
			}
		})
		// node stroke color is function of ordinal color scheme for 3rd order tags
    	.attr("stroke", function(d) { 
			return colorCategories[d.group - 1];
     	})
		// node stroke opacity is function of 0 or 1, depending on toggle button
    	.attr("stroke-width", 2*activeStroke)

	// hovering over a node with the cursor causes the network to focus on linked nodes
    node.on("mouseover", focus).on("mouseout", unfocus);
    
	// prevents mouse capture
    node.call(
        d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
    );
    
	// label node stylization
    var labelNode = container.append("g").attr("class", "labelNodes")
        .selectAll("text")
        .data(label.nodes)
        .enter()
        .append("text")
        .text(function(d, i) { return i % 2 == 0 ? "" : d.node.id; })
			.style("fill", "#000")
			.style("font-family", "Arial")
			.style("font-size", 18)
			.attr("font-weight", 700)
			.style("stroke", "#fff")
			.style("stroke-width", 0.6)
        .style("pointer-events", "none"); // to prevent mouseover/drag capture
    
    node.on("mouseover", focus).on("mouseout", unfocus);
    
	//	tick event handler
    function ticked() {
		// redraws tag nodes and links per tick
        node.call(updateNode);
        link.call(updateLink);
    
		// redraws label nodes per tick that is driven by tag node movement
        labelLayout.alphaTarget(0.3).restart();
        labelNode.each(function(d, i) {
            if(i % 2 == 0) {
                d.x = d.node.x;
                d.y = d.node.y;
            } else {
                var b = this.getBBox();
    
                var diffX = d.x - d.node.x;
                var diffY = d.y - d.node.y;
    
                var dist = Math.sqrt(diffX * diffX + diffY * diffY);
    
                var shiftX = b.width * (diffX - dist) / (dist * 2);
                shiftX = Math.max(-b.width, Math.min(0, shiftX));
                var shiftY = 16;
                this.setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
            }
        });
        labelNode.call(updateNode);
    }
    
    function fixna(x) {
        if (isFinite(x)) return x;
        return 0;
    }
    
	// upon node mouseover, decreases opacity of nodes and links that are not linked to focused node
    function focus(d) {
        var index = d3.select(d3.event.target).datum().index;
        node.style("opacity", function(o) {
            return neigh(index, o.index) ? 1 : 0.1;
        });
        labelNode.attr("display", function(o) {
          return neigh(index, o.node.index) ? "block": "none";
        });
        link.style("opacity", function(o) {
            return o.source.index == index || o.target.index == index ? 1 : 0.1;
        });
    }
    
	// resets node and link opacity to full once node is unfocused
    function unfocus() {
       labelNode.attr("display", "block");
       node.style("opacity", 1);
       link.style("opacity", 1);
    }
	
    // redraws tag link endpoints per tick
    function updateLink(link) {
        link.attr("x1", function(d) { return fixna(d.source.x); })
            .attr("y1", function(d) { return fixna(d.source.y); })
            .attr("x2", function(d) { return fixna(d.target.x); })
            .attr("y2", function(d) { return fixna(d.target.y); });
    }
    
	// redraws tag nodes per tick
    function updateNode(node) {
        node.attr("transform", function(d) {
            return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
        });
    }
    
	//	drag event handlers
    function dragstarted(d) {
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.active) graphLayout.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }
    function dragended(d) {
        if (!d3.event.active) graphLayout.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    });	
}

loadNetwork(activeFile);

// STUDENT TOGGLE

// Detects event when change student data button is clicked
var changeNetwork = d3.select("#changeNetworkSource").on('click', toggleNetworkSource);

// Upon clicking the "Change Student" button
var c = d3.select("#changeNetworkSource").node();
var intersectButton = d3.select("#changeIntersectionForce").node();
function toggleNetworkSource(event) {
	// Set active JSON file to other student
	// Change button text accordingly to other student
	if (activeFile == null) {
		activeFile = student1;
		c.innerHTML = "Load Student 2";
	}
	if (activeFile == student1){
		activeFile = student2;
		c.innerHTML = "Load Student 1";
	}
	else {
		activeFile = student1;
		c.innerHTML = "Load Student 2";
	}
	// Clear graph visualization
	var svg = d3.select("#viz");
	svg.selectAll("*").remove();
	// Load new graph visualization
	loadNetwork(activeFile);
	
	// Correct tag intersection button text after reloading
	if (activeIntersection = 1) {	
		intersectButton.innerHTML = "Remove tag intersection";
	}
	else if (activeIntersection = 0) {	
		intersectButton.innerHTML = "Show tag intersection";
	}
	
	console.log("Switched network source to " + activeFile);		
}

// TAG NODE STROKE TOGGLE

// Detects event when toggle tag node stroke button is clicked
var changeNode = d3.select("#changeNodeStroke").on('click', toggleNodeStroke);

// Upon clicking "Toggle stroke visibility" button
var s = d3.select("#changeNodeStroke").node();
function toggleNodeStroke(event) {
	// Change button text accordingly to other option
	var s = d3.select("#changeNodeStroke").node();
	if (activeStroke == null) {
		activeStroke = 1;
		s.innerHTML = "Hide tag colors";
	}
	if (activeStroke == 1) {
		activeStroke = 0;
		s.innerHTML = "Show tag colors";
	}
	else if (activeStroke == 0) {
		activeStroke = 1;
		s.innerHTML = "Hide tag colors";
	}
	
	// Set node stroke width to 0 (not visible) or 2 (visible)
	var circles = d3.select("#viz").select(".nodes").selectAll("circle")
		.attr("stroke-width", 2*activeStroke);
	circles.exit().remove()
	
	console.log("Switched node stroke visibility to " + activeStroke);		
}

// DOCUMENT SIZE

function getWidth() {
	return Math.max(
		document.body.scrollWidth,
		document.documentElement.scrollWidth,
		document.body.offsetWidth,
		document.documentElement.offsetWidth,
		document.documentElement.clientWidth
    );
}
  
function getHeight() {
    return Math.max(
		document.body.scrollHeight,
		document.documentElement.scrollHeight,
		document.body.offsetHeight,
		document.documentElement.offsetHeight,
		document.documentElement.clientHeight
    );
}