d3.csv("data/All_Details.csv").then(function(songData) {
    // Normalize data
    const normalizedData = songData.map(row => ({
        Producer: row["Producer"]?.trim(),
        Album_Name: row["Album_Name"]?.trim(),
        Track_Name: row["Track_Name"]?.trim()
    }));

    const width = window.innerWidth;
    const height = window.innerHeight;
    const defaultZoomScale = 0.5; // Initial zoom level
    const defaultTranslateX = width / 5; // Centering the view horizontally
    const defaultTranslateY = height / 10; // Centering the view vertically

    const svg = d3.select("#network")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().scaleExtent([0, 5]).on("zoom", (event) => g.attr("transform", event.transform)));

    const g = svg.append("g")
        .attr("transform", `translate(${defaultTranslateX}, ${defaultTranslateY}) scale(${defaultZoomScale})`); // Initial transform

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const legendData = [
        { label: "Producer", color: colorScale(1) },
        { label: "Album", color: colorScale(2) },
        { label: "Song", color: colorScale(3) }
    ];

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20, 20)");

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 25 + 15)
        .text(d => d.label)
        .style("font-size", "14px")
        .attr("alignment-baseline", "middle");

    // Function to create the force-directed tree
    function createForceDirectedTree(clusterBy, topX) {
        // Limit data to top X songs based on parameter
        const limitedData = normalizedData.slice(0, topX);
        const clusters = d3.group(limitedData, d => d[clusterBy], d => d.Album_Name);
        const rootData = { name: "Arijit Singh", children: [] };

        clusters.forEach((albums, producer) => {
            const producerNode = { 
                name: producer, 
                children: [], 
                albumCount: albums.size 
            };

            albums.forEach((songs, albumName) => {
                const albumNode = { name: albumName, children: [] };

                songs.forEach(song => {
                    albumNode.children.push({
                        name: song.Track_Name,
                        data: {
                            Producer: song.Producer,
                            Album_Name: song.Album_Name,
                            Track_Name: song.Track_Name
                        }
                    });
                });

                producerNode.children.push(albumNode);
            });

            rootData.children.push(producerNode);
        });

        const root = d3.hierarchy(rootData);

        const simulation = d3.forceSimulation(root.descendants())
            .force("link", d3.forceLink(root.links())
                .distance(d => {
                    if (d.target.depth === 1) return 50;
                    if (d.target.depth === 2) return 10;
                    if (d.target.depth === 3) return 5;
                    return 50;
                })
                .strength(1)
                .id(d => d.id)
            )
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
            .force("collide", d3.forceCollide(30));

        g.selectAll("*").remove();

        const link = g.selectAll(".link")
            .data(root.links())
            .enter().append("line")
            .attr("class", "link")
            .style("stroke-width", d => d.target.depth === 3 ? 1 : 2);

        const node = g.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", "node")
            .call(drag(simulation));

        node.append("circle")
            .attr("r", d => d.depth === 1 ? 20 : d.depth === 2 ? 15 : 8)
            .attr("fill", d => colorScale(d.depth))
            .each(function(d) { d.originalColor = colorScale(d.depth); })  // Store original color
            .on("mouseover", function(event, d) {
                let tooltipText = '';
                if (d.depth === 1) {
                    tooltipText = `Producer: ${d.data.name}<br>Albums: ${d.data.albumCount || 0}`;
                } else if (d.depth === 2) {
                    tooltipText = `Album: ${d.data.name}<br>Producer: ${d.parent.data.name}`;
                } else if (d.depth === 3) {
                    tooltipText = `Song: ${d.data.data.Track_Name}<br>Album: ${d.parent.data.name}<br>Producer: ${d.parent.parent.data.name}`;
                }
        
                d3.select(this)
                    .attr("fill", "yellow")
                    .attr("r", d.depth === 1 ? 24 : d.depth === 2 ? 18 : 10);
                
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(tooltipText)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("fill", d.originalColor)  // Revert to original color
                    .attr("r", d.depth === 1 ? 20 : d.depth === 2 ? 15 : 8);
                
                tooltip.transition().duration(500).style("opacity", 0);
            });

        node.filter(d => d.depth !== 3).append("text")
            .text(d => d.data.name)
            .attr("x", -10)
            .attr("y", -18);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("font-size", "16px")
            .style("padding", "10px")
            .style("background-color", "#333")
            .style("color", "#fff")
            .style("border-radius", "8px")
            .style("box-shadow", "0px 0px 8px rgba(0, 0, 0, 0.3)");

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

    d3.select("#updateButton").on("click", function() {
        const topX = +d3.select("#topSongs").property("value");
        createForceDirectedTree("Producer", topX);
    });

    createForceDirectedTree("Producer", 27);  // Default to top 27 songs

    window.addEventListener("resize", () => {
        svg.attr("width", window.innerWidth).attr("height", window.innerHeight);
    });
}).catch(function(error) {
    console.error("Error loading the data: ", error);
});
