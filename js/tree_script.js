d3.csv("data/All_Details.csv").then(function(songData) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const svg = d3.select("#network")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().scaleExtent([0.5, 5]).on("zoom", (event) => g.attr("transform", event.transform)));

    const g = svg.append("g");

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    function createForceDirectedTree(clusterBy) {
        const clusters = d3.group(songData, d => d[clusterBy]);
        const rootData = { name: "Root", children: [] };

        clusters.forEach((songs, cluster) => {
            rootData.children.push({
                name: cluster,
                children: songs
            });
        });

        const root = d3.hierarchy(rootData);
        
        const simulation = d3.forceSimulation(root.descendants())
            .force("link", d3.forceLink(root.links()).distance(100).strength(1).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(50));

        g.selectAll("*").remove();

        const link = g.selectAll(".link")
            .data(root.links())
            .enter().append("line")
            .attr("class", "link");

        const node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", "node")
            .call(drag(simulation));

        node.append("circle")
            .attr("r", d => d.depth === 1 ? 20 : 10)
            .attr("fill", d => colorScale(d.depth))
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "yellow").attr("r", d.depth === 1 ? 24 : 14);
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(d.data.name || d.data.Track_Name)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", colorScale(d.depth)).attr("r", d.depth === 1 ? 20 : 10);
                tooltip.transition().duration(500).style("opacity", 0);
            });

        node.append("text")
            .text(d => d.data.name || d.data.Track_Name)
            .attr("x", 10)
            .attr("y", 3);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip");

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        });

        function drag(simulation) {
            return d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                });
        }
    }

    d3.select("#loading").style("display", "none");
    createForceDirectedTree("Producer");

    d3.select("#clustering").on("change", function() {
        const selectedCluster = d3.select(this).property("value");
        createForceDirectedTree(selectedCluster);
    });

    window.addEventListener("resize", () => {
        svg.attr("width", window.innerWidth).attr("height", window.innerHeight);
    });
}).catch(function(error) {
    console.error("Error loading the data: ", error);
});
