d3.json("data/songs.json").then(function(songData) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select("#network")
        .attr("width", width)
        .attr("height", height);

    // Create a group element to contain the nodes and links
    const g = svg.append("g");

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.75, 5]) // Set zoom limits
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Define a color scale for the clusters
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Function to create the clustering
    function createClusters(clusterBy) {
        const clusters = d3.group(songData, d => d[clusterBy]);

        // Clear previous links and nodes
        g.selectAll("*").remove();

        // Create master nodes for each cluster
        const masterNodes = Array.from(clusters.keys()).map(key => ({
            name: key,
            type: clusterBy
        }));

        // Create links and nodes
        const links = [];
        const nodes = masterNodes.concat(songData);

        masterNodes.forEach((masterNode, i) => {
            const clusterColor = colorScale(i); // Assign a color to each cluster
            const clusterSongs = clusters.get(masterNode.name);

            // Connect each song to its parent node
            clusterSongs.forEach(song => {
                links.push({ source: masterNode, target: song });
                song.color = d3.color(clusterColor).brighter(1); // Lighter version for children
            });
            
            // Set the color for each master node
            masterNode.color = clusterColor;
        });

        // Create simulation
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink().distance(100).strength(1))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2));

        // Create the links
        const linkElements = g.append("g")
            .selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link");

        // Create the nodes
        const nodeElements = g.append("g")
            .selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node");

        nodeElements.append("circle")
            .attr("r", d => d.type === clusterBy ? 20 : 10) // Larger for parent nodes
            .attr("fill", d => d.color || "steelblue") // Use the assigned color
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "yellow"); // Highlight on hover

                // Show tooltip
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(d.name ? `Cluster: ${d.name}` : `Title: ${d.title}<br>Language: ${d.language}<br>Director: ${d.musicDirector}<br>Year: ${d.year}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", d.color || "steelblue");
                
                // Hide tooltip
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        nodeElements.append("text")
            .text(d => d.name || d.title)
            .attr("x", 15)
            .attr("y", 3);

        // Create tooltip div
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("text-align", "center")
            .style("padding", "8px")
            .style("background", "lightsteelblue")
            .style("border", "1px solid #999")
            .style("border-radius", "5px")
            .style("pointer-events", "none")
            .style("opacity", 0);

        simulation.force("link").links(links);

        simulation.on("tick", () => {
            nodeElements.attr("transform", d => `translate(${d.x},${d.y})`);
            linkElements
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
        });
    }

    // Initialize clustering with default value
    createClusters("director");

    // Update clustering on dropdown change
    d3.select("#clustering").on("change", function() {
        const selectedCluster = d3.select(this).property("value");
        createClusters(selectedCluster);
    });
}).catch(function(error) {
    console.error("Error loading the data: ", error);
});
